import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Public endpoint (Make.com calls this directly, no browser session) —
// protected by a shared secret instead of the dashboard's auth middleware.
// Configure this same value as BOOKED_CALL_WEBHOOK_SECRET in Vercel, then
// point the Make scenario's HTTP module at:
// https://<your-domain>/api/webhooks/booked-call?secret=<value>

// Paula's team added a custom Bookings question ("How are you booking?" —
// Self-Booked / Call-In) whose answer lands in the calendar event's raw
// HTML body under a "Custom Fields" section, e.g. "Answer- Call-In" or
// "Answer - Call-In" — confirmed live the dash spacing isn't consistent
// between bookings, so it's tolerated here rather than assumed.
function sourceFromEventBody(eventBody: unknown): string {
  if (typeof eventBody !== "string") return "microsoft_link";
  const match = eventBody.match(/How are you booking\?[\s\S]{0,80}?Answer\s*-\s*([^<\r\n]+)/i);
  const answer = match?.[1]?.trim().toLowerCase();
  if (!answer) return "microsoft_link";
  if (answer.includes("call")) return "agent_call_in";
  return "microsoft_link";
}

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
    // An explicit source (if ever sent) wins; otherwise derive it from the
    // booking's "How are you booking?" custom-question answer, since every
    // booking today comes through the same shared link regardless of how
    // the person actually got there.
    const source = body.source || sourceFromEventBody(body.eventBody);

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
