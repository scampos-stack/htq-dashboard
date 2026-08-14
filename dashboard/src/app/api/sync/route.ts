import { NextResponse } from "next/server";
import { syncWoodpecker } from "@/lib/sync-woodpecker";
import { syncKeap } from "@/lib/sync-keap";

export async function POST() {
  try {
    const [woodpecker, keap] = await Promise.all([
      syncWoodpecker().catch((err) => ({ error: String(err) })),
      syncKeap().catch((err) => ({ error: String(err) })),
    ]);
    return NextResponse.json({ ok: true, woodpecker, keap });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
