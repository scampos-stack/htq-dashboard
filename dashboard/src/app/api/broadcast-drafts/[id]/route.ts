import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Partial update — the edit form only sends the fields it actually changed,
// so this must not overwrite unspecified fields back to null.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const columnMap: Record<string, string> = {
      campaignTheme: "campaign_theme",
      targetDate: "target_date",
      listSegment: "list_segment",
      focus: "focus",
      utmCampaign: "utm_campaign",
      audienceEstimate: "audience_estimate",
      status: "status",
      subject: "subject",
      preheader: "preheader",
      introParagraphs: "intro_paragraphs",
      highlightHeading: "highlight_heading",
      highlightBody: "highlight_body",
      ctaText: "cta_text",
      ctaUrl: "cta_url",
      closingParagraph: "closing_paragraph",
      signoffLine: "signoff_line",
      signoffSubtext: "signoff_subtext",
      footerNoteText: "footer_note_text",
      footerNoteLinkText: "footer_note_link_text",
      footerNoteLinkUrl: "footer_note_link_url",
    };

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, column] of Object.entries(columnMap)) {
      if (key in body) update[column] = body[key];
    }
    if (Object.keys(update).length === 1) {
      return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("broadcast_drafts").update(update).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update draft";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { error } = await supabase.from("broadcast_drafts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete draft";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
