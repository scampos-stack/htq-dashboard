import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Public endpoint (Keap's servers call this directly, no browser session) —
// protected by a shared secret instead of the dashboard's auth middleware.
// Configure this same value as KEAP_WEBHOOK_SECRET in Vercel, then set the
// webhook URL in Keap as: https://<your-domain>/api/webhooks/keap?secret=<value>

// Maps our event_type values to the campaign_stats_snapshot column they bump.
const EVENT_TO_FIELD: Record<string, "sent" | "opened" | "clicked"> = {
  email_sent: "sent",
  email_opened: "opened",
  email_clicked: "clicked",
};

async function bumpAutomationEventCount(
  supabase: ReturnType<typeof supabaseServer>,
  automationName: string,
  field: "sent" | "opened" | "clicked"
) {
  // Ties webhook-tracked events back into the same campaign_stats_snapshot
  // rows that feed the All Sources / By Carrier tables. Matched with a
  // contains-search (not an exact match) since the name typed into Keap's
  // HTTP step body can drift slightly from the automation's real name
  // (e.g. "Farmers Nurture" vs the real "Farmers Nurture Drip") — an exact
  // match silently finds nothing in that case.
  const { data: matches } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("source", "keap")
    .ilike("name", `%${automationName}%`)
    .limit(1);
  const campaign = matches?.[0];
  if (!campaign) return;

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("campaign_stats_snapshot")
    .select(`id, ${field}`)
    .eq("campaign_id", campaign.id)
    .is("step", null)
    .is("version", null)
    .eq("pulled_at", today)
    .maybeSingle();

  if (existing) {
    const current = (existing as unknown as Record<string, number>)[field] ?? 0;
    await supabase
      .from("campaign_stats_snapshot")
      .update({ [field]: current + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("campaign_stats_snapshot").insert({
      campaign_id: campaign.id,
      step: null,
      version: null,
      pulled_at: today,
      [field]: 1,
    });
  }
}

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

    const field = EVENT_TO_FIELD[String(eventType)];
    if (field && automationName) {
      await bumpAutomationEventCount(supabase, String(automationName), field);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to store event";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
