import { supabaseServer } from "./supabase-server";

const API_BASE = "https://api.woodpecker.co/rest/v1";

async function wpFetch(path: string) {
  const key = process.env.WOODPECKER_API_KEY;
  if (!key) throw new Error("Missing WOODPECKER_API_KEY env var");

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-api-key": key },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Woodpecker API ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

type WoodpeckerCampaign = {
  id: number;
  name: string;
  status: string;
  from_name?: string;
};

type WoodpeckerCampaignDetail = WoodpeckerCampaign & {
  stats?: {
    sent: number;
    bounced: number;
    opened: number;
    clicked: number;
    optout: number;
    delivery: number;
    replied: number;
    interested: number;
    maybe_later: number;
    not_interested: number;
  };
};

export async function syncWoodpecker(): Promise<{
  campaigns: number;
  snapshots: number;
}> {
  const supabase = supabaseServer();

  const campaignList: WoodpeckerCampaign[] = await wpFetch("/campaign_list");

  const campaignsPayload = campaignList.map((c) => ({
    source: "woodpecker",
    external_id: String(c.id),
    name: c.name,
    owner: c.from_name || null,
    status: c.status || null,
  }));

  const { data: upsertedCampaigns, error: campaignErr } = await supabase
    .from("campaigns")
    .upsert(campaignsPayload, { onConflict: "source,external_id" })
    .select("id, external_id");
  if (campaignErr) throw campaignErr;

  const campaignIdByExternalId = new Map(
    (upsertedCampaigns ?? []).map((c) => [c.external_id, c.id])
  );

  const snapshotPayload = [];
  for (const c of campaignList) {
    const [detail]: WoodpeckerCampaignDetail[] = await wpFetch(
      `/campaign_list?id=${c.id}`
    );
    const s = detail?.stats;
    if (!s) continue;

    snapshotPayload.push({
      campaign_id: campaignIdByExternalId.get(String(c.id)),
      step: null,
      version: null,
      sent: s.sent ?? 0,
      bounced: s.bounced ?? 0,
      bounce_rate: s.sent ? Number(((s.bounced / s.sent) * 100).toFixed(1)) : null,
      opened: s.opened ?? 0,
      opened_rate: s.sent ? Number(((s.opened / s.sent) * 100).toFixed(1)) : null,
      clicked: s.clicked ?? 0,
      opt_out: s.optout ?? 0,
      opt_out_rate: s.sent ? Number(((s.optout / s.sent) * 100).toFixed(1)) : null,
      delivered: s.delivery ?? 0,
      responded: s.replied ?? 0,
      responded_rate: s.sent ? Number(((s.replied / s.sent) * 100).toFixed(1)) : null,
      interested_yes: s.interested ?? null,
      interested_maybe: s.maybe_later ?? null,
      interested_no: s.not_interested ?? null,
    });
  }

  const { error: snapshotErr } = await supabase
    .from("campaign_stats_snapshot")
    .upsert(snapshotPayload, { onConflict: "campaign_id,step,version,pulled_at" });
  if (snapshotErr) throw snapshotErr;

  return { campaigns: campaignsPayload.length, snapshots: snapshotPayload.length };
}
