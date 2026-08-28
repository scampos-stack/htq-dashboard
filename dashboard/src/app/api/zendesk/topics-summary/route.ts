import { NextResponse } from "next/server";
import { generateZendeskTopicsSummary } from "@/lib/generate-summary";

// Manual trigger for the Zendesk "Top Topics (AI Summary)" card — the
// automatic path only regenerates on a sync that adds new tickets.
export async function POST() {
  try {
    const result = await generateZendeskTopicsSummary();
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
