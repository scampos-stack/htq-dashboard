import { NextResponse } from "next/server";
import { syncKeapEmailAggregate } from "@/lib/sync-keap";
import { errorMessage } from "@/lib/error-message";

// Isolated into its own cron job — paginates up to 300 pages sequentially
// and needs the full 300s budget, same reasoning as the manual-sync
// /api/sync/keap-emails route this mirrors.
export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncKeapEmailAggregate();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron] keapEmails failed:", err);
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
