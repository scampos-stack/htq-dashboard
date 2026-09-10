import * as cheerio from "cheerio";
import type { BroadcastDraftContent } from "./broadcast-draft-template";

// Best-effort extraction from an uploaded HTML email matching the HTQ send
// template shell (hidden preheader div, a content <td> with a greeting
// paragraph, optional highlight box / CTA button / footer note tables, then
// signoff paragraphs). This pre-fills the draft form — it's not meant to be
// perfect, the user reviews and corrects fields before saving.
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
  let ctaText: string | null = null;
  let ctaUrl: string | null = null;
  const closingParagraphs: string[] = [];
  let footerNoteText: string | null = null;
  let footerNoteLinkText: string | null = null;
  let footerNoteLinkUrl: string | null = null;
  const signoffParagraphs: string[] = [];

  let sawGreeting = false;
  let sawBlock = false; // true once we've passed the first table block (highlight or CTA)

  contentTd.children().each((_, el) => {
    const node = $(el);
    const tag = el.tagName?.toLowerCase();

    if (tag === "p") {
      const text = node.text().trim();
      if (!text) return;
      if (!sawGreeting && /Hi\s+~?Contact\.FirstName~?,?/i.test(text)) {
        sawGreeting = true;
        return;
      }
      if (!sawBlock) {
        introParagraphs.push(text);
      } else {
        // After the first table block, short trailing paragraphs are
        // signoff lines (e.g. "Your friends at ..." / "For agents. By
        // agents.") rather than body copy — anything substantially longer
        // reads as a genuine closing paragraph instead.
        if (text.length > 90 && closingParagraphs.length === 0 && signoffParagraphs.length === 0) {
          closingParagraphs.push(text);
        } else {
          signoffParagraphs.push(text);
        }
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
        footerNoteText = cellClone.text().trim() || null;
        sawBlock = true;
        return;
      }

      // Otherwise treat it as the highlight box: first inner block is the
      // bold heading, the next is the body copy.
      const divs = node.find("td > div, td > font > div");
      if (divs.length > 0) {
        highlightHeading = divs.first().text().trim() || null;
        if (divs.length > 1) highlightBody = divs.eq(1).text().trim() || null;
      } else {
        highlightBody = node.find("td").first().text().trim() || null;
      }
      sawBlock = true;
      return;
    }
  });

  return {
    preheader,
    introParagraphs,
    highlightHeading,
    highlightBody,
    ctaText,
    ctaUrl,
    closingParagraph: closingParagraphs[0] ?? null,
    signoffLine: signoffParagraphs[0] ?? null,
    signoffSubtext: signoffParagraphs[1] ?? null,
    footerNoteText,
    footerNoteLinkText,
    footerNoteLinkUrl,
  };
}
