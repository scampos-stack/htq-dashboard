import { NextResponse } from "next/server";
import { syncWoodpecker } from "@/lib/sync-woodpecker";
import { syncKeap, syncKeapEmailAggregate } from "@/lib/sync-keap";

export async function POST() {
  try {
    const [woodpecker, keap, keapEmails] = await Promise.all([
      syncWoodpecker().catch((err) => {
        console.error("[sync] woodpecker failed:", err);
        return { error: String(err) };
      }),
      syncKeap().catch((err) => {
        console.error("[sync] keap failed:", err);
        return { error: String(err) };
      }),
      syncKeapEmailAggregate().catch((err) => {
        console.error("[sync] keapEmails failed:", err);
        return { error: String(err) };
      }),
    ]);
    return NextResponse.json({ ok: true, woodpecker, keap, keapEmails });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
