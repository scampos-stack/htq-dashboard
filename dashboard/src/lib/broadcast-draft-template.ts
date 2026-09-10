export type BroadcastDraftContent = {
  preheader: string | null;
  introParagraphs: string[];
  highlightHeading: string | null;
  highlightBody: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  closingParagraph: string | null;
  signoffLine: string | null;
  signoffSubtext: string | null;
  footerNoteText: string | null;
  footerNoteLinkText: string | null;
  footerNoteLinkUrl: string | null;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Matches the real send template's shell (logo header, green rule, body
// copy, optional highlight box, CTA button, optional footer note, signoff)
// so every draft previews exactly like what will actually go out — swap
// this function's markup if the real Keap template ever changes.
export function renderBroadcastDraftHtml(c: BroadcastDraftContent): string {
  const highlightBox =
    c.highlightHeading || c.highlightBody
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;background-color:#F3F7EF;border-left:4px solid #5B9E31;"><tr>
<td style="padding:20px 22px;font-family:Arial, Helvetica, sans-serif;">
${c.highlightHeading ? `<div style="font-size:16px;font-weight:bold;color:#2F3E1E;padding-bottom:8px;">${esc(c.highlightHeading)}</div>` : ""}
${c.highlightBody ? `<div style="font-size:15px;line-height:1.6;color:#333333;">${esc(c.highlightBody)}</div>` : ""}
</td></tr></table>`
      : "";

  const ctaButton =
    c.ctaText && c.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;"><tr>
<td align="center" bgcolor="#5B9E31" style="border-radius:4px;">
<a href="${esc(c.ctaUrl)}" style="display:inline-block;padding:15px 30px;font-family:Arial, Helvetica, sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:4px;">${esc(c.ctaText)}</a>
</td></tr></table>`
      : "";

  const footerNote = c.footerNoteText
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0 0;border-top:1px solid #E2E2E2;"><tr>
<td style="padding:18px 0 0 0;font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.6;color:#777777;">
${esc(c.footerNoteText)}
${c.footerNoteLinkText && c.footerNoteLinkUrl ? ` <a href="${esc(c.footerNoteLinkUrl)}" style="color:#5B9E31;font-weight:bold;text-decoration:underline;">${esc(c.footerNoteLinkText)}</a>` : ""}
</td></tr></table>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;">
<div style="display:none;font-size:1px;color:#f0f0f0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(c.preheader ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f0f0;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid #E2E2E2;border-radius:6px;">
<tr><td align="center" style="padding:32px 40px 8px 40px;border-bottom:3px solid #5B9E31;">
<img src="https://hometownquotes.com/wp-content/uploads/2019/09/logo-1.png" alt="Hometown Quotes" width="240" style="display:block;width:240px;max-width:240px;height:auto;border:0;">
<div style="font-family:Arial, Helvetica, sans-serif;font-size:11px;letter-spacing:1px;color:#777777;padding:10px 0 20px 0;">FOR AGENTS. BY AGENTS.</div>
</td></tr>
<tr><td style="padding:34px 40px 30px 40px;font-family:Arial, Helvetica, sans-serif;font-size:16px;line-height:1.6;color:#333333;">
<p style="margin:0 0 18px 0;">Hi ~Contact.FirstName~,</p>
${c.introParagraphs.map((p) => `<p style="margin:0 0 18px 0;">${esc(p)}</p>`).join("\n")}
${highlightBox}
${ctaButton}
${c.closingParagraph ? `<p style="margin:0;">${esc(c.closingParagraph)}</p>` : ""}
${footerNote}
${c.signoffLine ? `<p style="margin:26px 0 0 0;">${esc(c.signoffLine)}</p>` : ""}
${c.signoffSubtext ? `<p style="margin:2px 0 0 0;font-size:13px;color:#777777;">${esc(c.signoffSubtext)}</p>` : ""}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
