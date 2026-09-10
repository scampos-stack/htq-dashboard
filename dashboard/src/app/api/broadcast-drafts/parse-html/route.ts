import { NextResponse } from "next/server";
import { parseBroadcastEmailHtml } from "@/lib/parse-broadcast-email-html";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const html = typeof body.html === "string" ? body.html : "";
    if (!html.trim()) {
      return NextResponse.json({ ok: false, error: "No HTML provided." }, { status: 400 });
    }

    const content = parseBroadcastEmailHtml(html);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse HTML";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
