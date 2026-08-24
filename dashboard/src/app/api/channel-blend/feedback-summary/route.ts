import { NextResponse } from "next/server";
import { generateChannelBlendFeedbackSummary } from "@/lib/generate-summary";

// Manual trigger for the "Top Feedback (AI Summary)" card — the automatic
// path only regenerates on an upload that adds new Feedback rows, so this
// covers existing data uploaded before that trigger existed, or just
// picking up a newly-configured ANTHROPIC_API_KEY.
export async function POST() {
  try {
    const result = await generateChannelBlendFeedbackSummary();
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
