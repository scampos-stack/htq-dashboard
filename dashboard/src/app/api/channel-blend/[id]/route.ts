import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { category, leadName, state, details } = body;

    if (!category || typeof category !== "string" || !category.trim()) {
      return NextResponse.json(
        { ok: false, error: "Category is required." },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("channel_blend_dispositions")
      .update({
        category: category.trim(),
        lead_name: leadName || null,
        state: state || null,
        details: details || null,
      })
      .eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update entry";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    const { error } = await supabase
      .from("channel_blend_dispositions")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete entry";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
