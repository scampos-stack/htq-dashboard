import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const EDITABLE_FIELDS: Record<string, string> = {
  content: "content",
  imageUrl: "image_url",
  account: "account",
  status: "status",
  scheduledDate: "scheduled_date",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, column] of Object.entries(EDITABLE_FIELDS)) {
      if (key in body) update[column] = body[key];
    }
    if (Object.keys(update).length === 1) {
      return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase.from("linkedin_posts").update(update).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update LinkedIn post";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { error } = await supabase.from("linkedin_posts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete LinkedIn post";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
