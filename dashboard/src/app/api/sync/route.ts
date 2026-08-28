import { NextResponse } from "next/server";
import { syncWoodpecker } from "@/lib/sync-woodpecker";
import { syncKeap, syncKeapEmailAggregate } from "@/lib/sync-keap";
import { syncZendesk } from "@/lib/sync-zendesk";
import { generateWoodpeckerExecutiveSummary, generateZendeskTopicsSummary } from "@/lib/generate-summary";
import { errorMessage } from "@/lib/error-message";

// Four integrations run in parallel here (Woodpecker incl. step-stats
// polling, Keap, Zendesk incl. groups/tickets/metrics) and can combine to
// run long — ask for the platform max; Vercel silently caps this to
// whatever the plan actually allows, so it's safe to request more than
// might be honored.
export const maxDuration = 300;

async function syncWoodpeckerAndSummary() {
  const result = await syncWoodpecker();
  // Chained, not parallel — the summary reads the data syncWoodpecker just
  // wrote. A failure here doesn't undo the sync, just skips the summary.
  const summary = await generateWoodpeckerExecutiveSummary().catch((err) => {
    console.error("[sync] ai summary failed:", err);
    return { generated: false, reason: errorMessage(err) };
  });
  return { ...result, aiSummary: summary };
}

async function syncZendeskAndSummary() {
  const result = await syncZendesk();
  if (result.tickets > 0) {
    await generateZendeskTopicsSummary().catch((err) => {
      console.error("[sync] zendesk topics summary failed:", err);
    });
  }
  return result;
}

export async function POST() {
  try {
    const [woodpecker, keap, keapEmails, zendesk] = await Promise.all([
      syncWoodpeckerAndSummary().catch((err) => {
        console.error("[sync] woodpecker failed:", err);
        return { error: errorMessage(err) };
      }),
      syncKeap().catch((err) => {
        console.error("[sync] keap failed:", err);
        return { error: errorMessage(err) };
      }),
      syncKeapEmailAggregate().catch((err) => {
        console.error("[sync] keapEmails failed:", err);
        return { error: errorMessage(err) };
      }),
      syncZendeskAndSummary().catch((err) => {
        console.error("[sync] zendesk failed:", err);
        return { error: errorMessage(err) };
      }),
    ]);
    return NextResponse.json({ ok: true, woodpecker, keap, keapEmails, zendesk });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
