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
      const style = ($(child).attr("style") ?? "").toLowerCase();
      const isBold = tag === "strong" || tag === "b" || /font-weight:\s*(bold|[6-9]00)/.test(style);
      const inner = toBoldMarkdown($, child);
      out += isBold ? `**${inner.trim()}**` : inner;
    });
  return out;
}

export function parseBroadcastEmailHtml(html: string): Partial<BroadcastDraftContent> {
  const $ = cheerio.load(html);

  const preheader = $('div[style*="display:none"]').first().text().trim() || null;

  // The content <td> is the one whose padding matches the template's body
  // cell (34px top) — distinguishes it from the header <td> (which has the
  // logo) and the outer wrapper <td>s.
  let contentTd = $("td").filter((_, el) => /padding:\s*34px/.test($(el).attr("style") ?? "")).first();
  if (contentTd.length === 0) {
    // Fallback: the <td> that directly contains the greeting paragraph.
    contentTd = $("p")
      .filter((_, el) => /Hi\s+~?Contact\.FirstName~?,?/i.test($(el).text()))
      .first()
      .parent("td");
  }
  if (contentTd.length === 0) {
    return { preheader };
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

  contentTd.children().each((_, el) => {
    const node = $(el);
    const tag = el.tagName?.toLowerCase();

    if (tag === "p") {
      // A signoff like "Talk soon,<br>The Hometown Quotes Team" is one <p>
      // with an embedded <br> — split on it so both halves survive as
      // separate lines instead of getting jammed into one run-on string.
      const rawHtml = node.html() ?? "";
      const lines = /<br\s*\/?>/i.test(rawHtml)
        ? rawHtml
            .split(/<br\s*\/?>/i)
            .map((f) => {
              const $f = cheerio.load(`<div>${f}</div>`);
              return toBoldMarkdown($f, $f("div").get(0)).trim();
            })
            .filter(Boolean)
        : [toBoldMarkdown($, el).trim()].filter(Boolean);
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
        footerNoteText = toBoldMarkdown($, cellClone.get(0)).trim() || null;
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
        highlightBody = toBoldMarkdown($, divs.eq(1).get(0)).trim() || null;
      } else if (nestedTable.length > 0 && bulletRows.length > 0) {
        const outerCell = node.find("td").first();
        const headingEl = outerCell.find("> p, > div, > strong, > b").first();
        highlightHeading = headingEl.text().trim() || null;
        highlightBullets = bulletRows
          .map((_, tr) => toBoldMarkdown($, $(tr).find("td").last().get(0)).trim())
          .get()
          .filter(Boolean);
      } else if (pChildren.length > 1 && bulletPrefixedP >= Math.ceil(pChildren.length / 2)) {
        const bulletLines: string[] = [];
        const plainLines: string[] = [];
        pChildren.each((_, p) => {
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

  // The last 1-2 short lines (e.g. "Your friends at Hometown Quotes",
  // "For agents. By agents.") are the signoff; everything before that,
  // however many lines, is closing body copy.
  const remaining = [...trailingLines];
  const signoffCandidates: string[] = [];
  while (remaining.length > 0 && signoffCandidates.length < 2 && remaining[remaining.length - 1].length <= 60) {
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
    signoffSubtext: signoffCandidates[1] ?? null,
    footerNoteText,
    footerNoteLinkText,
    footerNoteLinkUrl,
  };
}
