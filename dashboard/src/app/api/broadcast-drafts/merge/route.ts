import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Fields eligible to be filled in on the primary draft from the duplicate
// — anything empty/null/blank on the primary gets the duplicate's value if
// the duplicate actually has one. Deliberately excludes identity/workflow
// columns (id, target_date, list_segment, status, assigned_to, version) —
// merging content shouldn't silently change which segment/date/status the
// kept draft represents.
const MERGEABLE_COLUMNS = [
  "campaign_theme",
  "focus",
  "utm_campaign",
  "audience_estimate",
  "subject",
  "preheader",
  "intro_paragraphs",
  "highlight_heading",
  "highlight_body",
  "highlight_bullets",
  "cta_text",
  "cta_url",
  "closing_paragraphs",
  "signoff_line",
  "signoff_subtext",
  "footer_note_text",
  "footer_note_link_text",
  "footer_note_link_url",
];

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const primaryId = Number(body.primaryId);
    const duplicateId = Number(body.duplicateId);
    if (!primaryId || !duplicateId || primaryId === duplicateId) {
      return NextResponse.json({ ok: false, error: "Two distinct draft ids are required." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: rows, error: fetchErr } = await supabase
      .from("broadcast_drafts")
      .select("*")
      .in("id", [primaryId, duplicateId]);
    if (fetchErr) throw fetchErr;

    const primary = rows?.find((r) => r.id === primaryId);
    const duplicate = rows?.find((r) => r.id === duplicateId);
    if (!primary || !duplicate) {
      return NextResponse.json({ ok: false, error: "One or both drafts not found." }, { status: 404 });
    }

    const fill: Record<string, unknown> = {};
    const filledFields: string[] = [];
    for (const col of MERGEABLE_COLUMNS) {
      if (isEmpty(primary[col]) && !isEmpty(duplicate[col])) {
        fill[col] = duplicate[col];
        filledFields.push(col);
      }
    }

    if (Object.keys(fill).length > 0) {
      fill.updated_at = new Date().toISOString();
      const { error: updateErr } = await supabase.from("broadcast_drafts").update(fill).eq("id", primaryId);
      if (updateErr) throw updateErr;
    }

    const { error: deleteErr } = await supabase.from("broadcast_drafts").delete().eq("id", duplicateId);
    if (deleteErr) throw deleteErr;

    return NextResponse.json({ ok: true, filledFields });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to merge drafts";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
