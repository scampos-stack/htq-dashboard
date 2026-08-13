import { NextResponse } from "next/server";
import { syncWoodpecker } from "@/lib/sync-woodpecker";

export async function POST() {
  try {
    const result = await syncWoodpecker();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
