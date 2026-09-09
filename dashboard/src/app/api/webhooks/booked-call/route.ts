import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Public endpoint (Make.com calls this directly, no browser session) —
// protected by a shared secret instead of the dashboard's auth middleware.
// Configure this same value as BOOKED_CALL_WEBHOOK_SECRET in Vercel, then
// point the Make scenario's HTTP module at:
// https://<your-domain>/api/webhooks/booked-call?secret=<value>

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (!secret || secret !== process.env.BOOKED_CALL_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const externalEventId = body.externalEventId ?? body.eventId ?? body.id ?? null;
    const contactName = body.contactName ?? body.name ?? null;
    const contactEmail = body.contactEmail ?? body.email ?? null;
    const eventSubject = body.eventSubject ?? body.subject ?? null;
    const scheduledAt = body.scheduledAt ?? body.startDateTime ?? body.start ?? null;
    // Only one source feeds this webhook today (the Microsoft 365 calendar
    // scenario); accept an explicit source so a future second source
    // (e.g. a different booking link) doesn't need a new endpoint.
    const source = body.source || "microsoft_link";

    const supabase = supabaseServer();
    const { error } = await supabase.from("booked_calls").upsert(
      {
        source,
        external_event_id: externalEventId ? String(externalEventId) : null,
        contact_name: contactName,
        contact_email: contactEmail,
        event_subject: eventSubject,
        scheduled_at: scheduledAt,
        raw: body,
      },
      { onConflict: "external_event_id" }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to store booked call";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
