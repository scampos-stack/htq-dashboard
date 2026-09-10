import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseServerAuth } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (!comment) {
      return NextResponse.json({ ok: false, error: "Comment text is required." }, { status: 400 });
    }

    const {
      data: { user },
    } = await (await supabaseServerAuth()).auth.getUser();
    const author = user?.email ?? "Unknown";

    const selectedText = typeof body.selectedText === "string" && body.selectedText.trim() ? body.selectedText.trim() : null;

    const supabase = supabaseServer();
    let { data, error } = await supabase
      .from("broadcast_draft_comments")
      .insert({ draft_id: Number(id), author, comment, selected_text: selectedText })
      .select("id, draft_id, author, comment, selected_text, applied, created_at")
      .single();
    if (error) {
      // Migration 023 (selected_text column) may not have run yet.
      const fallback = await supabase
        .from("broadcast_draft_comments")
        .insert({ draft_id: Number(id), author, comment })
        .select("id, draft_id, author, comment, applied, created_at")
        .single();
      data = fallback.data ? { ...fallback.data, selected_text: null } : null;
      error = fallback.error;
    }
    if (error) throw error;

    return NextResponse.json({ ok: true, comment: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add comment";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
