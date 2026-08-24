import { NextResponse } from "next/server";
import { generateChannelBlendPatternsSummary } from "@/lib/generate-summary";

// Manual trigger for the "Recurring Patterns (AI Summary)" card — the
// automatic path only regenerates on an upload that adds new rows, so this
// covers existing data uploaded before that trigger existed, or just
// picking up a newly-configured ANTHROPIC_API_KEY.
export async function POST() {
  try {
    const result = await generateChannelBlendPatternsSummary();
    if (!result.generated) {
      return NextResponse.json(
        { ok: false, error: result.reason ?? "Summary not generated" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate summary";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
