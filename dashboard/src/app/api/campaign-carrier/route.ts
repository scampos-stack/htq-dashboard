import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { campaignId, carrier } = await req.json();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "Missing campaignId" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const { error } = await supabase
      .from("campaigns")
      .update({ carrier: carrier || null })
      .eq("id", campaignId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save carrier";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
