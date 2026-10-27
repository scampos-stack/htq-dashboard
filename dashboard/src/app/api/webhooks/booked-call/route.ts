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

// All four Microsoft Bookings pages (Email Marketing, Happen Media,
// Website, LinkedIn) share the same "Service name" ("15-minute HTQ
// Discovery"), so the calendar event's subject is IDENTICAL no matter
// which page was used — confirmed live on 2026-10-27: a booking made
// through the HTQ LinkedIn page still came through with subject
// "15-minute HTQ Discovery - <name>". Subject can't distinguish them.
// What's actually different is the event's organizer — each Bookings page
// is its own Microsoft 365 "booking business" with its own mailbox, which
// Graph surfaces as organizer.emailAddress.address (e.g.
// HTQLinkedIn@HometownQuotes.onmicrosoft.com). The Make HTTP module needs
// {{2.organizer.emailAddress.address}} mapped into a bookingOrganizerEmail
// field for this to work — see the webhook's own comment below if that
// field is ever missing.
const ORGANIZER_EMAIL_SOURCES: Record<string, string> = {
  "htqdiscoverycall@hometownquotes.onmicrosoft.com": "email_marketing",
  "hometownquoteshappenmedia@hometownquotes.onmicrosoft.com": "happen_media",
  "hometownquoteswebsite@hometownquotes.onmicrosoft.com": "website",
  "htqlinkedin@hometownquotes.onmicrosoft.com": "linkedin",
};

function sourceFromOrganizerEmail(organizerEmail: unknown): string | null {
  if (typeof organizerEmail !== "string") return null;
  return ORGANIZER_EMAIL_SOURCES[organizerEmail.trim().toLowerCase()] ?? null;
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
    // An explicit source (if ever sent) wins. Otherwise, which of the four
    // Bookings pages this came from — identified by the event's organizer
    // mailbox — is the more specific signal; the "How are you booking?"
    // custom-question answer (self-booked vs. called in) is a fallback for
    // events sent before bookingOrganizerEmail was wired up in Make, or
    // that otherwise don't match a known organizer.
    const source =
      body.source ||
      sourceFromOrganizerEmail(body.bookingOrganizerEmail) ||
      sourceFromEventBody(body.eventBody);

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
