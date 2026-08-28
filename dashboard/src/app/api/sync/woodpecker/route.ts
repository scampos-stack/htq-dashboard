import { NextResponse } from "next/server";
import { syncWoodpecker } from "@/lib/sync-woodpecker";
import { generateWoodpeckerExecutiveSummary } from "@/lib/generate-summary";
import { errorMessage } from "@/lib/error-message";

// Split out from the combined /api/sync route — step-stats polling alone
// can take up to ~30s, and bundling every source into one request meant
// they all shared (and could blow) a single function timeout.
export const maxDuration = 120;

export async function POST() {
  try {
    const result = await syncWoodpecker();
    // Chained, not parallel — the summary reads the data syncWoodpecker
    // just wrote. A failure here doesn't undo the sync, just skips it.
    const aiSummary = await generateWoodpeckerExecutiveSummary().catch((err) => {
      console.error("[sync] woodpecker ai summary failed:", err);
      return { generated: false, reason: errorMessage(err) };
    });
    return NextResponse.json({ ok: true, ...result, aiSummary });
  } catch (err) {
    console.error("[sync] woodpecker failed:", err);
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
