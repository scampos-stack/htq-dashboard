import { NextResponse } from "next/server";
import { generateAllSourcesDigest } from "@/lib/generate-summary";
import { errorMessage } from "@/lib/error-message";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sinceParam = typeof body.since === "string" ? body.since : null;
    const untilParam = typeof body.until === "string" ? body.until : null;

    const since = sinceParam
      ? new Date(sinceParam)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          return d;
        })();
    const until = untilParam ? new Date(untilParam) : undefined;

    const result = await generateAllSourcesDigest({ since, until });
    if (!result.generated) {
      return NextResponse.json(
        { ok: false, error: result.reason ?? "Digest not generated" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: errorMessage(err) }, { status: 500 });
  }
}
