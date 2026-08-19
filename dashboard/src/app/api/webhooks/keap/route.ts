import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Public endpoint (Keap's servers call this directly, no browser session) —
// protected by a shared secret instead of the dashboard's auth middleware.
// Configure this same value as KEAP_WEBHOOK_SECRET in Vercel, then set the
// webhook URL in Keap as: https://<your-domain>/api/webhooks/keap?secret=<value>

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.KEAP_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    // Keap's webhook payload shape varies by event source; capture what we
    // can and keep the raw body for anything we didn't anticipate.
    const eventType = body.event_type ?? body.eventType ?? body.type ?? "unknown";
    const automationId = body.campaign_id ?? body.automation_id ?? null;
    const automationName = body.campaign_name ?? body.automation_name ?? null;
    const contactEmail = body.contact_email ?? body.email ?? null;

    const supabase = supabaseServer();
    const { error } = await supabase.from("keap_automation_events").insert({
      automation_id: automationId ? String(automationId) : null,
      automation_name: automationName,
      event_type: String(eventType),
      contact_email: contactEmail,
      raw: body,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to store event";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
