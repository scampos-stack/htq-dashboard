import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Toggles a comment's resolved state without deleting it — the approval
// trail (who raised what, when) has to stay intact even after it's been
// addressed, whether that happened via AI regenerate or a manual edit.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const body = await req.json();
    const resolved = Boolean(body.resolved);

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("broadcast_draft_comments")
      .update({ resolved })
      .eq("id", commentId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update comment";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
