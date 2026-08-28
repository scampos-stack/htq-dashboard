import { supabaseServer } from "./supabase-server";
import { classifyCarrier } from "./classify-carrier";

const API_BASE = "https://api.infusionsoft.com/crm/rest/v1";

async function keapFetch(path: string) {
  const key = process.env.KEAP_API_KEY;
  if (!key) throw new Error("Missing KEAP_API_KEY env var");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Keap API ${path} -> ${res.status} ${res.statusText}${body ? `: ${body}` : ""}`);
  }
  return res.json();
}

type KeapCampaign = {
  id: number;
  name: string;
  published_status: boolean;
  active_contact_count: number;
  completed_contact_count: number;
};

// First-pass keyword heuristic since Keap's API has no native lead-marketing
// vs customer/comms field. Flagged for manual review, not authoritative.
const CUSTOMER_COMMS_KEYWORDS = [
  "onboard",
  "welcome",
  "renewal",
  "support",
  "service",
  "account",
  "activate",
  "receipt",
  "confirmation",
  "agent enrolled",
];

function classify(name: string): string {
  const lower = name.toLowerCase();
  return CUSTOMER_COMMS_KEYWORDS.some((kw) => lower.includes(kw))
    ? "automation_customer_comms"
    : "automation_lead_marketing";
}

export async function syncKeap(): Promise<{
  campaigns: number;
  snapshots: number;
}> {
  const supabase = supabaseServer();

  const data = await keapFetch("/campaigns?limit=1000");
  const campaigns: KeapCampaign[] = data.campaigns ?? [];

  const campaignsPayload = campaigns.map((c) => ({
    source: "keap",
    external_id: String(c.id),
    name: c.name,
    status: c.published_status ? "PUBLISHED" : "UNPUBLISHED",
    category: classify(c.name),
    carrier: classifyCarrier(c.name),
  }));

  const { data: upserted, error: campaignErr } = await supabase
    .from("campaigns")
    .upsert(campaignsPayload, { onConflict: "source,external_id" })
    .select("id, external_id");
  if (campaignErr) throw campaignErr;

  const idByExternalId = new Map((upserted ?? []).map((c) => [c.external_id, c.id]));

  const snapshotPayload = campaigns.map((c) => ({
    campaign_id: idByExternalId.get(String(c.id)),
    step: null,
    version: null,
    active_contacts: c.active_contact_count ?? 0,
    completed_contacts: c.completed_contact_count ?? 0,
  }));

  const { error: snapshotErr } = await supabase
    .from("campaign_stats_snapshot")
    .upsert(snapshotPayload, { onConflict: "campaign_id,step,version,pulled_at" });
  if (snapshotErr) throw snapshotErr;

  return { campaigns: campaignsPayload.length, snapshots: snapshotPayload.length };
}

type KeapEmail = {
  opened_date: string | null;
  clicked_date: string | null;
};

// Account-wide totals only — Keap's /emails records carry no campaign or
// automation ID, so this can't be broken out per automation/broadcast.
// "delivered" is approximated as sent (no bounce field is exposed on this
// endpoint; Keap's own dashboard shows bounce rates well under 1%).
export async function syncKeapEmailAggregate(
  days = 30
): Promise<{ sent: number; opened: number; clicked: number }> {
  const supabase = supabaseServer();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceParam = encodeURIComponent(since.toISOString());

  let sent = 0;
  let opened = 0;
  let clicked = 0;
  let path = `/emails?limit=1000&since_sent_date=${sinceParam}`;

  for (let page = 0; page < 20 && path; page++) {
    const data = await keapFetch(path);
    const emails: KeapEmail[] = data.emails ?? [];
    sent += emails.length;
    opened += emails.filter((e) => e.opened_date).length;
    clicked += emails.filter((e) => e.clicked_date).length;

    if (!data.next) break;
    path = data.next.replace(API_BASE, "");
  }

  const externalId = "__all_emails__";
  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .upsert(
      {
        source: "keap",
        external_id: externalId,
        name: `All Keap Marketing Emails (last ${days}d)`,
        category: "email_aggregate",
      },
      { onConflict: "source,external_id" }
    )
    .select("id")
    .single();
  if (campaignErr) throw campaignErr;

  const { error: snapshotErr } = await supabase
    .from("campaign_stats_snapshot")
    .upsert(
      {
        campaign_id: campaign.id,
        step: null,
        version: null,
        sent,
        delivered: sent,
        opened,
        opened_rate: sent ? Number(((opened / sent) * 100).toFixed(1)) : null,
        clicked,
      },
      { onConflict: "campaign_id,step,version,pulled_at" }
    );
  if (snapshotErr) throw snapshotErr;

  return { sent, opened, clicked };
}
