import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { campaignId, category, excludeFromMetrics } = await req.json();
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "Missing campaignId" }, { status: 400 });
    }

    const supabase = supabaseServer();
    const update: Record<string, unknown> = {};
    if (category !== undefined) update.category = category || null;
    if (excludeFromMetrics !== undefined) update.exclude_from_metrics = !!excludeFromMetrics;

    const { error } = await supabase.from("campaigns").update(update).eq("id", campaignId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save automation goal";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
