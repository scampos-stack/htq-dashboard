import { NextResponse } from "next/server";
import { syncWoodpecker } from "@/lib/sync-woodpecker";
import { syncKeap, syncKeapEmailAggregate } from "@/lib/sync-keap";
import { syncZendesk } from "@/lib/sync-zendesk";
import { generateWoodpeckerExecutiveSummary } from "@/lib/generate-summary";

// Zendesk's incremental export can take several polls across pages; give
// the sync route more headroom than the platform default.
export const maxDuration = 60;

async function syncWoodpeckerAndSummary() {
  const result = await syncWoodpecker();
  // Chained, not parallel — the summary reads the data syncWoodpecker just
  // wrote. A failure here doesn't undo the sync, just skips the summary.
  const summary = await generateWoodpeckerExecutiveSummary().catch((err) => {
    console.error("[sync] ai summary failed:", err);
    return { generated: false, reason: String(err) };
  });
  return { ...result, aiSummary: summary };
}

export async function POST() {
  try {
    const [woodpecker, keap, keapEmails, zendesk] = await Promise.all([
      syncWoodpeckerAndSummary().catch((err) => {
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
      syncZendesk().catch((err) => {
        console.error("[sync] zendesk failed:", err);
        return { error: String(err) };
      }),
    ]);
    return NextResponse.json({ ok: true, woodpecker, keap, keapEmails, zendesk });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
