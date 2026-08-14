import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { domain, note } = await req.json();
    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ ok: false, error: "Missing domain" }, { status: 400 });
    }

    const supabase = supabaseServer();

    if (!note || !note.trim()) {
      const { error } = await supabase.from("domain_notes").delete().eq("domain", domain);
      if (error) throw error;
      return NextResponse.json({ ok: true, deleted: true });
    }

    const { error } = await supabase
      .from("domain_notes")
      .upsert({ domain, note, updated_at: new Date().toISOString() });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save note";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
