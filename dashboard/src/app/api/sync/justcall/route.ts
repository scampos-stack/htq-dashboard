import { NextResponse } from "next/server";
import { syncJustCall } from "@/lib/sync-justcall";
import { errorMessage } from "@/lib/error-message";

export const maxDuration = 120;

export async function POST() {
  try {
    const result = await syncJustCall();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync] justcall failed:", err);
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
