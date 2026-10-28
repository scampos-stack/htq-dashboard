import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { commentId } = await params;
    const body = await _req.json();
    const resolved = Boolean(body.resolved);

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("linkedin_post_comments")
      .update({ resolved })
      .eq("id", commentId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update comment";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
