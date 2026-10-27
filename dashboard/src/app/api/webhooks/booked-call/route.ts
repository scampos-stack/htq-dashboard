import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Public endpoint (Make.com calls this directly, no browser session) —
// protected by a shared secret instead of the dashboard's auth middleware.
// Configure this same value as BOOKED_CALL_WEBHOOK_SECRET in Vercel, then
// point the Make scenario's HTTP module at:
// https://<your-domain>/api/webhooks/booked-call?secret=<value>

// `source` and `how_booked` answer two different questions and both come
// out of the same `eventBody` field, which the Make scenario maps as
// "{{2.organizer.emailAddress.address}}|||{{2.body.content}}" (no schema
// edit needed — just that one formula in the existing field) so both
// pieces travel together without a second body field. Older payload shapes
// are still supported: a bare email with no "|||" (the brief window where
// eventBody carried only the organizer), or the full HTML body alone (the
// original shape, pre-page-tracking).
const EVENT_BODY_DELIMITER = "|||";

function splitEventBody(eventBody: unknown): { organizerEmail: string | null; html: string | null } {
  if (typeof eventBody !== "string") return { organizerEmail: null, html: null };
  if (eventBody.includes(EVENT_BODY_DELIMITER)) {
    const [org, ...rest] = eventBody.split(EVENT_BODY_DELIMITER);
    return { organizerEmail: org.trim() || null, html: rest.join(EVENT_BODY_DELIMITER).trim() || null };
  }
  if (eventBody.includes("<")) return { organizerEmail: null, html: eventBody };
  return { organizerEmail: eventBody.trim() || null, html: null };
}

// Each Bookings page (Email Marketing, Happen Media, Website, LinkedIn) is
// its own Microsoft 365 "booking business" with its own mailbox — the
// event's organizer — which is the only reliable way to tell them apart:
// confirmed live on 2026-10-27 that all four share the same "Service name"
// ("15-minute HTQ Discovery"), so the calendar event's subject is
// identical no matter which page was used.
const ORGANIZER_EMAIL_SOURCES: Record<string, string> = {
  "htqdiscoverycall@hometownquotes.onmicrosoft.com": "email_marketing",
  "hometownquoteshappenmedia@hometownquotes.onmicrosoft.com": "happen_media",
  "hometownquoteswebsite@hometownquotes.onmicrosoft.com": "website",
  "htqlinkedin@hometownquotes.onmicrosoft.com": "linkedin",
};

function sourceFromOrganizerEmail(organizerEmail: string | null): string | null {
  if (!organizerEmail) return null;
  return ORGANIZER_EMAIL_SOURCES[organizerEmail.toLowerCase()] ?? null;
}

// Paula's team added a custom Bookings question ("How are you booking?" —
// Self-Booked / Call-In), present on every Bookings page, not just one —
// so it's a separate axis from `source` (which page), not a substitute for
// it. The answer lands in the calendar event's raw HTML body under a
// "Custom Fields" section, e.g. "Answer- Call-In" or "Answer - Call-In" —
// confirmed live the dash spacing isn't consistent between bookings, so
// it's tolerated here rather than assumed.
function howBookedFromHtml(html: string | null): string | null {
  if (!html) return null;
  const match = html.match(/How are you booking\?[\s\S]{0,80}?Answer\s*-\s*([^<\r\n]+)/i);
  const answer = match?.[1]?.trim().toLowerCase();
  if (!answer) return null;
  if (answer.includes("call")) return "call_in";
  if (answer.includes("self")) return "self_booked";
  return null;
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
    const { organizerEmail, html } = splitEventBody(body.eventBody);

    // An explicit value (if ever sent) wins for either field; otherwise
    // each is derived independently from its own signal — which Bookings
    // page (organizer) has nothing to do with how the booking was made
    // (the custom question), so neither should fall back to the other.
    const source = body.source || sourceFromOrganizerEmail(body.bookingOrganizerEmail) || sourceFromOrganizerEmail(organizerEmail) || "unknown";
    const howBooked = body.howBooked || howBookedFromHtml(html) || null;

    const supabase = supabaseServer();
    const { error } = await supabase.from("booked_calls").upsert(
      {
        source,
        how_booked: howBooked,
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
