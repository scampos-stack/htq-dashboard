import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

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
