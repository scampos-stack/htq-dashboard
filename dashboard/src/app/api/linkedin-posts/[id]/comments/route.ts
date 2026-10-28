import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseServerAuth } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("linkedin_post_comments")
      .select("id, linkedin_post_id, author, comment, resolved, created_at")
      .eq("linkedin_post_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, comments: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load comments";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

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

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("linkedin_post_comments")
      .insert({ linkedin_post_id: Number(id), author, comment })
      .select("id, linkedin_post_id, author, comment, resolved, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, comment: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add comment";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
