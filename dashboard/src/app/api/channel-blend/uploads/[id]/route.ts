import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Lets the period be set or corrected after the fact — uploaders often
// don't know it (or forget) at upload time.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { periodStart, periodEnd } = body;

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("channel_blend_uploads")
      .update({
        period_start: periodStart || null,
        period_end: periodEnd || null,
      })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update period";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Reverts one upload: deletes only the disposition rows it added (other
// uploads' rows are untouched) and marks the upload record reverted rather
// than deleting it, so the history list still shows what happened.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();

    const { error: deleteErr } = await supabase
      .from("channel_blend_dispositions")
      .delete()
      .eq("upload_id", id);
    if (deleteErr) throw deleteErr;

    const { error: revertErr } = await supabase
      .from("channel_blend_uploads")
      .update({ reverted_at: new Date().toISOString() })
      .eq("id", id);
    if (revertErr) throw revertErr;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revert upload";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
