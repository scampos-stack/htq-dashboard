import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { LINKEDIN_ACCOUNTS } from "@/lib/data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, account } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ ok: false, error: "Post content is required." }, { status: 400 });
    }
    if (!account || !LINKEDIN_ACCOUNTS.includes(account)) {
      return NextResponse.json({ ok: false, error: "A valid account is required." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("linkedin_posts")
      .insert({
        broadcast_draft_id: body.broadcastDraftId ?? null,
        content: content.trim(),
        image_url: body.imageUrl || null,
        account,
        status: body.status || "draft",
        scheduled_date: body.scheduledDate || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save LinkedIn post";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
