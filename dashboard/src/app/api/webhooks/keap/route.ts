import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// Public endpoint (Keap's servers call this directly, no browser session) —
// protected by a shared secret instead of the dashboard's auth middleware.
// Configure this same value as KEAP_WEBHOOK_SECRET in Vercel, then set the
// webhook URL in Keap as: https://<your-domain>/api/webhooks/keap?secret=<value>

// Classifies an event_type string to the campaign_stats_snapshot column it
// bumps. Prefix/contains matched (not exact) so named sub-types — e.g.
// "link_clicked_calendar" vs "link_clicked_vip_form" for tracking Paula's
// Calendar vs the VIP Form separately — still roll up into the same
// "clicked" total while remaining distinct rows in keap_automation_events
// (the Automation Event Volume table groups by the literal event_type, so
// each sub-type still gets its own column there).
type StatField = "sent" | "opened" | "clicked" | "opt_out";

function classifyEventType(eventType: string): StatField | null {
  const t = eventType.toLowerCase();
  if (t.includes("unsubscri") || t.includes("opt_out") || t.includes("optout")) return "opt_out";
  if (t.includes("click")) return "clicked";
  if (t.includes("open")) return "opened";
  if (t.includes("sent")) return "sent";
  return null;
}

async function bumpAutomationEventCount(
  supabase: ReturnType<typeof supabaseServer>,
  automationName: string,
  field: StatField
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

    const field = classifyEventType(String(eventType));
    if (field && automationName) {
      await bumpAutomationEventCount(supabase, String(automationName), field);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to store event";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
