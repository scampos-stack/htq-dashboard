import { NextResponse } from "next/server";
import { syncZendesk } from "@/lib/sync-zendesk";
import { generateZendeskTopicsSummary } from "@/lib/generate-summary";
import { errorMessage } from "@/lib/error-message";

export const maxDuration = 120;

export async function POST() {
  try {
    const result = await syncZendesk();
    if (result.tickets > 0) {
      await generateZendeskTopicsSummary().catch((err) => {
        console.error("[sync] zendesk topics summary failed:", err);
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync] zendesk failed:", err);
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
