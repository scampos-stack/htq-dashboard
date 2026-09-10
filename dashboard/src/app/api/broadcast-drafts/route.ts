import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { campaignTheme, targetDate, listSegment } = body;

    if (!campaignTheme || typeof campaignTheme !== "string" || !campaignTheme.trim()) {
      return NextResponse.json({ ok: false, error: "Campaign theme is required." }, { status: 400 });
    }
    if (!targetDate || Number.isNaN(Date.parse(targetDate))) {
      return NextResponse.json({ ok: false, error: "A valid target date is required." }, { status: 400 });
    }
    if (!listSegment || typeof listSegment !== "string" || !listSegment.trim()) {
      return NextResponse.json({ ok: false, error: "List segment is required." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("broadcast_drafts")
      .insert({
        campaign_theme: campaignTheme.trim(),
        target_date: targetDate,
        list_segment: listSegment.trim(),
        focus: body.focus || null,
        utm_campaign: body.utmCampaign || null,
        audience_estimate: body.audienceEstimate ? Number(body.audienceEstimate) : null,
        status: body.status || "not_started",
        subject: body.subject || null,
        preheader: body.preheader || null,
        intro_paragraphs: Array.isArray(body.introParagraphs) ? body.introParagraphs : [],
        highlight_heading: body.highlightHeading || null,
        highlight_body: body.highlightBody || null,
        cta_text: body.ctaText || null,
        cta_url: body.ctaUrl || null,
        closing_paragraph: body.closingParagraph || null,
        signoff_line: body.signoffLine || null,
        signoff_subtext: body.signoffSubtext || null,
        footer_note_text: body.footerNoteText || null,
        footer_note_link_text: body.footerNoteLinkText || null,
        footer_note_link_url: body.footerNoteLinkUrl || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create draft";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
