import { NextResponse } from "next/server";
import { syncKeapEmailAggregate } from "@/lib/sync-keap";
import { errorMessage } from "@/lib/error-message";

// Isolated from the other sources — this one paginates up to 300 pages
// (300k emails) sequentially and was the main contributor to the combined
// /api/sync route blowing its timeout. Even isolated with 120s it still
// hit FUNCTION_INVOCATION_TIMEOUT, so asking for the platform max; Vercel
// silently caps this to whatever the plan actually allows.
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await syncKeapEmailAggregate();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync] keapEmails failed:", err);
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
