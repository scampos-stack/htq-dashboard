import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { regenerateBroadcastDraftFromComment } from "@/lib/generate-summary";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const commentId = body.commentId;
    if (!commentId) {
      return NextResponse.json({ ok: false, error: "commentId is required." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data: comment, error: commentErr } = await supabase
      .from("broadcast_draft_comments")
      .select("id, comment, draft_id")
      .eq("id", commentId)
      .single();
    if (commentErr) throw commentErr;
    if (comment.draft_id !== Number(id)) {
      return NextResponse.json({ ok: false, error: "Comment does not belong to this draft." }, { status: 400 });
    }

    const result = await regenerateBroadcastDraftFromComment(Number(id), comment.comment);
    if (!result.generated) {
      return NextResponse.json({ ok: false, error: result.reason ?? "Regenerate failed" }, { status: 422 });
    }

    const { error: markErr } = await supabase
      .from("broadcast_draft_comments")
      .update({ applied: true })
      .eq("id", commentId);
    if (markErr) throw markErr;

    return NextResponse.json({ ok: true, changedFields: result.changedFields });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to regenerate draft";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
