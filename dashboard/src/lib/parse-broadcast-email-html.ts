import * as cheerio from "cheerio";
import type { BroadcastDraftContent } from "./broadcast-draft-template";

// Best-effort extraction from an uploaded HTML email matching the HTQ send
// template shell (hidden preheader div, a content <td> with a greeting
// paragraph, optional highlight box / CTA button / footer note tables, then
// signoff paragraphs). This pre-fills the draft form — it's not meant to be
// perfect, the user reviews and corrects fields before saving.
// Walks an element's inline content and re-serializes it to plain text,
// except bold-ish wrappers (<strong>, <b>, or a <span style="font-weight:
// bold/600-900">, as Keap/Outlook paste-in HTML uses) become **text**
// markdown so a bolded lead sentence inside a bullet survives being stored
// as a plain string. <br> becomes a newline so callers can split on it.
// renderBroadcastDraftHtml turns the markdown back into a <span> on output.
function isBoldStyle(style: string): boolean {
  return /font-weight:\s*(bold|[6-9]00)/.test(style.toLowerCase());
}

function toBoldMarkdown($: cheerio.CheerioAPI, el: unknown): string {
  let out = "";
  $(el as never)
    .contents()
    .each((_, child) => {
      if (child.type === "text") {
        out += $(child).text();
        return;
      }
      if (child.type !== "tag") return;
      const tag = child.tagName?.toLowerCase();
      if (tag === "br") {
        out += "\n";
        return;
      }
      const isBold = tag === "strong" || tag === "b" || isBoldStyle($(child).attr("style") ?? "");
      const inner = toBoldMarkdown($, child);
      out += isBold ? `**${inner.trim()}**` : inner;
    });
  return out;
}

// Same as toBoldMarkdown, but also checks the passed-in element's OWN style
// — not just its descendants' — for font-weight:bold. Needed for markup
// like <p style="font-weight:bold;color:#2F3E1E;">Dr. Paula J. Gregory</p>,
// where the whole line is bold via the block element's own style rather
// than a <strong>/<b>/<span> wrapping part of it (toBoldMarkdown alone
// only ever sees that on a *child* of the element it's called with).
function elementToBoldMarkdown($: cheerio.CheerioAPI, el: unknown): string {
  const node = $(el as never);
  const tag = (el as { tagName?: string })?.tagName?.toLowerCase();
  const inner = toBoldMarkdown($, el).trim();
  const isBold = tag === "strong" || tag === "b" || isBoldStyle(node.attr("style") ?? "");
  if (!isBold || inner === "" || /^\*\*[\s\S]*\*\*$/.test(inner)) return inner;
  return `**${inner}**`;
}

export function parseBroadcastEmailHtml(html: string): Partial<BroadcastDraftContent> {
  const $ = cheerio.load(html);

  const preheader = $('div[style*="display:none"]').first().text().trim() || null;

  // Two real layouts seen: (1) one content <td> holds everything — greeting,
  // body, highlight box, CTA, signature, footer — as a flat list of
  // children, or (2) each section is its own <tr><td> in the main 600px
  // table (e.g. a "Signature" row, a "Footer" row), with the greeting only
  // sharing a <td> with the first couple of intro paragraphs. closest
  // ("table") on the greeting finds that main table either way — for (1)
  // it's the table whose lone row *is* the content td; for (2) it's the
  // table that directly contains every section's row — so walking its rows
  // generalizes both: (1) is just the one-row case of the same loop.
  const greetingP = $("p")
    .filter((_, el) => /Hi\s+~?Contact\.FirstName~?,?/i.test($(el).text()))
    .first();
  const contentTable = greetingP.closest("table");
  // Direct child <td>s of that table, in document order, skipping a <tbody>
  // wrapper if the parser inserted one — e.g. [logo td, body td, callout
  // td, cta td, signature td, footer td] for layout (2) above, or just
  // [content td] for layout (1).
  let contentCells = contentTable.find("> tbody > tr > td");
  if (contentCells.length === 0) contentCells = contentTable.find("> tr > td");
  if (contentCells.length === 0) {
    // Fallback for a greeting that isn't inside any <table> at all.
    const contentTd = greetingP.parent("td");
    if (contentTd.length === 0) return { preheader };
    contentCells = contentTd;
  }

  const introParagraphs: string[] = [];
  let highlightHeading: string | null = null;
  let highlightBody: string | null = null;
  let highlightBullets: string[] = [];
  let ctaText: string | null = null;
  let ctaUrl: string | null = null;
  // Everything after the first table block, in document order — split into
  // closing paragraphs vs. signoff only after the full pass (see below),
  // since a short "mini-heading" paragraph (e.g. "Why This Matters") in the
  // middle of real closing copy would otherwise get misread as a signoff
  // line by a single forward pass that only looks at length.
  const trailingLines: string[] = [];
  let footerNoteText: string | null = null;
  let footerNoteLinkText: string | null = null;
  let footerNoteLinkUrl: string | null = null;

  let sawGreeting = false;
  let sawBlock = false; // true once we've passed the first table block (highlight or CTA)

  contentCells.each((_, cellEl) => {
    let cellMatchedPorTable = false;

    $(cellEl)
      .children()
      .each((_, el) => {
        const node = $(el);
        const tag = el.tagName?.toLowerCase();
        if (tag === "p" || tag === "table") cellMatchedPorTable = true;

        if (tag === "p") {
      // A signoff like "Talk soon,<br>The Hometown Quotes Team" is one <p>
      // with an embedded <br> — split on it so both halves survive as
      // separate lines instead of getting jammed into one run-on string.
      // A bold signature name is sometimes the whole <p>'s own style (e.g.
      // <p style="font-weight:bold;...">Dr. Paula J. Gregory</p>) rather
      // than a <strong>/<span> inside it — that style is lost once we split
      // into <br> fragments, so carry it forward explicitly for that case.
      const pIsBold = isBoldStyle(node.attr("style") ?? "");
      const rawHtml = node.html() ?? "";
      const lines = /<br\s*\/?>/i.test(rawHtml)
        ? rawHtml
            .split(/<br\s*\/?>/i)
            .map((f) => {
              const $f = cheerio.load(`<div>${f}</div>`);
              const text = toBoldMarkdown($f, $f("div").get(0)).trim();
              if (!text) return "";
              return pIsBold && !/^\*\*[\s\S]*\*\*$/.test(text) ? `**${text}**` : text;
            })
            .filter(Boolean)
        : [elementToBoldMarkdown($, el)].filter(Boolean);
      if (lines.length === 0) return;

      if (!sawGreeting && /Hi\s+~?Contact\.FirstName~?,?/i.test(lines[0])) {
        sawGreeting = true;
        return;
      }
      if (!sawBlock) {
        introParagraphs.push(...lines);
      } else {
        trailingLines.push(...lines);
      }
      return;
    }

    if (tag === "table") {
      const link = node.find("a").first();
      const hasButtonLink = link.length > 0 && /border-radius/.test(node.find("td[bgcolor]").attr("style") ?? "");

      if (hasButtonLink) {
        ctaText = link.text().trim() || null;
        ctaUrl = link.attr("href") ?? null;
        sawBlock = true;
        return;
      }

      const isFooterNote = /border-top/.test(node.attr("style") ?? "");
      if (isFooterNote) {
        const cell = node.find("td").first();
        const noteLink = cell.find("a").first();
        footerNoteLinkText = noteLink.text().trim() || null;
        footerNoteLinkUrl = noteLink.attr("href") ?? null;
        const cellClone = cell.clone();
        cellClone.find("a").remove();
        footerNoteText = elementToBoldMarkdown($, cellClone.get(0)) || null;
        sawBlock = true;
        return;
      }

      // Highlight box: four real shapes seen — (a) two separate <div>s
      // (bold heading div + plain-text body div), (b) one flat <td> with
      // <strong>heading</strong><br> followed by &bull;-prefixed lines
      // separated by <br>, (c) a heading <p>/<div> followed by a NESTED
      // <table> where each bullet is its own <tr> (a bullet-icon <td> + a
      // text <td>), or (d) each bullet as its own <p> directly in the cell
      // (no <br>, no nested table — e.g. Paula's Sep 2026 template, where a
      // bullet's lead sentence is bolded with an inline <span>). (c) and (d)
      // need their own branches — there's no <br> to split on at all, so
      // the <br>-splitting logic for (b) would just concatenate the heading
      // and every bullet's text into one run-on string.
      const divs = node.find("td > div, td > font > div");
      const nestedTable = node.find("td > table");
      const bulletRows = nestedTable.find("tr").filter((_, tr) => $(tr).find("td").length >= 2);
      const cell = node.find("td").first();
      const pChildren = cell.children("p");
      const bulletPrefixedP = pChildren.filter((_, p) => /^[•*\-]/.test($(p).text().trim())).length;

      if (divs.length > 1) {
        highlightHeading = divs.first().text().trim() || null;
        highlightBody = elementToBoldMarkdown($, divs.eq(1).get(0)) || null;
      } else if (nestedTable.length > 0 && bulletRows.length > 0) {
        const outerCell = node.find("td").first();
        const headingEl = outerCell.find("> p, > div, > strong, > b").first();
        highlightHeading = headingEl.text().trim() || null;
        highlightBullets = bulletRows
          .map((_, tr) => elementToBoldMarkdown($, $(tr).find("td").last().get(0)))
          .get()
          .filter(Boolean);
      } else if (pChildren.length > 1 && bulletPrefixedP >= Math.ceil(pChildren.length / 2)) {
        const bulletLines: string[] = [];
        const plainLines: string[] = [];
        pChildren.each((_, p) => {
          // toBoldMarkdown, not elementToBoldMarkdown — a bullet <p> that's
          // bold at the block level would wrap the leading &bull; marker
          // in ** too, and the bullet-prefix regex below reads a leading
          // "*" as a bullet marker itself. Real templates only ever bold
          // part of a bullet's text via an inline span, never the <p>
          // (and the bullet char) as a whole, so this stays scoped to that.
          const raw = toBoldMarkdown($, p).trim();
          const bulletMatch = raw.replace(/\n/g, " ").match(/^[•*\-]\s*(.+)$/);
          if (bulletMatch) bulletLines.push(bulletMatch[1].trim());
          else if (raw) plainLines.push(raw);
        });
        if (bulletLines.length > 0) {
          highlightBullets = bulletLines;
          if (!highlightHeading && plainLines.length > 0 && plainLines[0].endsWith(":")) {
            highlightHeading = plainLines.shift() ?? null;
          }
        } else if (plainLines.length > 0) {
          highlightBody = plainLines.join(" ");
        }
      } else if (pChildren.length >= 1) {
        // (e) heading <p> + plain body <p>(s), no bullets, no <br> at all —
        // e.g. a callout with just "Who you'll be working with" then a
        // paragraph. There's nothing to split on, so read each <p> on its
        // own instead of the <br>-splitting fallback below (which would
        // otherwise glue every paragraph into one run-on string).
        const texts = pChildren
          .map((_, p) => elementToBoldMarkdown($, p))
          .get()
          .filter(Boolean);
        let bodyTexts = texts;
        const first = texts[0] ?? "";
        const firstIsHeading = (/^\*\*[\s\S]*\*\*$/.test(first) || first.trim().endsWith(":")) && texts.length > 1;
        if (firstIsHeading) {
          highlightHeading = first.replace(/^\*\*([^*]+)\*\*$/, "$1");
          bodyTexts = texts.slice(1);
        }
        if (bodyTexts.length > 0) highlightBody = bodyTexts.join(" ");
      } else {
        const lines = (cell.html() ?? "")
          .split(/<br\s*\/?>/i)
          .map((fragment) => {
            const $f = cheerio.load(`<div>${fragment}</div>`);
            return toBoldMarkdown($f, $f("div").get(0)).trim();
          })
          .filter(Boolean);

        const bulletLines: string[] = [];
        const plainLines: string[] = [];
        for (const line of lines) {
          const isHeadingTag = /^<(strong|b)>/i.test(cell.html() ?? "") && lines.indexOf(line) === 0;
          const bulletMatch = line.match(/^[•*\-]\s*(.+)$/);
          if (isHeadingTag && !highlightHeading) {
            highlightHeading = line.replace(/^\*\*([^*]+)\*\*$/, "$1");
          } else if (bulletMatch) {
            bulletLines.push(bulletMatch[1].trim());
          } else {
            plainLines.push(line);
          }
        }
        if (bulletLines.length > 0) {
          highlightBullets = bulletLines;
          // A heading line wasn't caught by the isHeadingTag check above
          // (e.g. no <strong> wrapper) but reads as one anyway — the first
          // plain line before any bullets, short, ending in ":".
          if (!highlightHeading && plainLines.length > 0 && plainLines[0].endsWith(":")) {
            highlightHeading = plainLines.shift() ?? null;
          }
        } else if (plainLines.length > 0) {
          highlightBody = plainLines.join(" ");
        }
      }
      sawBlock = true;
      return;
    }
      });

    // A cell whose content is just loose text/links directly in the <td>
    // (no <p>, no <table>) — e.g. a dark-background footer row with
    // "Hometown Quotes · For Agents, By Agents<br><a>hometownquotes.com</a>"
    // straight in the cell, not wrapped in a bordered footer table like the
    // other templates. Only once we're past the greeting, so the logo
    // header row (also p/table-free) is never mistaken for this.
    if (!cellMatchedPorTable && sawGreeting) {
      const cell = $(cellEl);
      const link = cell.find("a").first();
      const clone = cell.clone();
      clone.find("a").remove();
      const text = elementToBoldMarkdown($, clone.get(0));
      if (text) {
        footerNoteText = text;
        footerNoteLinkText = link.text().trim() || null;
        footerNoteLinkUrl = link.attr("href") ?? null;
        sawBlock = true;
      }
    }
  });

  // The trailing run of short lines is the signoff block; everything before
  // that, however many lines, is closing body copy. A short signoff can be
  // more than 2 lines — e.g. "To your success," / "Dr. Paula J. Gregory" /
  // "Vice President of Customer Success" / "Hometown Quotes | Hometown
  // University" is 4 — so this grabs the whole contiguous run off the end,
  // not just the last 2, with a generous cap so a run of short *body* lines
  // can't be mistaken for the whole signature.
  const remaining = [...trailingLines];
  const signoffCandidates: string[] = [];
  while (remaining.length > 0 && signoffCandidates.length < 6 && remaining[remaining.length - 1].length <= 60) {
    signoffCandidates.unshift(remaining.pop()!);
  }

  return {
    preheader,
    introParagraphs,
    highlightHeading,
    highlightBody,
    highlightBullets,
    ctaText,
    ctaUrl,
    closingParagraphs: remaining,
    signoffLine: signoffCandidates[0] ?? null,
    // Everything after the closer (name, title, org, ...) — the renderer
    // splits this back into its own lines and bolds the first one.
    signoffSubtext: signoffCandidates.length > 1 ? signoffCandidates.slice(1).join("\n") : null,
    footerNoteText,
    footerNoteLinkText,
    footerNoteLinkUrl,
  };
}
