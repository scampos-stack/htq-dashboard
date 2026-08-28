import { NextResponse } from "next/server";
import { syncKeap } from "@/lib/sync-keap";
import { errorMessage } from "@/lib/error-message";

export const maxDuration = 60;

export async function POST() {
  try {
    const result = await syncKeap();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync] keap failed:", err);
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
