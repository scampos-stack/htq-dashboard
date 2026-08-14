import { supabaseServer } from "./supabase-server";

const API_BASE = "https://api.infusionsoft.com/crm/rest/v1";

async function keapFetch(path: string) {
  const key = process.env.KEAP_API_KEY;
  if (!key) throw new Error("Missing KEAP_API_KEY env var");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Keap API ${path} -> ${res.status} ${res.statusText}`);
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
