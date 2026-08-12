import { supabaseServer } from "./supabase-server";

export type CampaignWithStats = {
  id: number;
  source: string;
  name: string;
  owner: string | null;
  status: string | null;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    opened_rate: number | null;
    clicked: number;
    bounced: number;
    bounce_rate: number | null;
    responded: number;
    responded_rate: number | null;
    interested_yes: number | null;
    interested_maybe: number | null;
    pulled_at: string;
  } | null;
};

export type RangeStats = { sent: number; delivered: number; opened: number };

export async function getDailyRangeTotals(
  days: number
): Promise<Map<number, RangeStats>> {
  const supabase = supabaseServer();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("campaign_stats_daily")
    .select("campaign_id, sent, delivered, opened")
    .gte("sent_date", sinceStr);
  if (error) throw error;

  const totals = new Map<number, RangeStats>();
  for (const row of data ?? []) {
    const existing = totals.get(row.campaign_id) ?? {
      sent: 0,
      delivered: 0,
      opened: 0,
    };
    existing.sent += row.sent;
    existing.delivered += row.delivered;
    existing.opened += row.opened;
    totals.set(row.campaign_id, existing);
  }
  return totals;
}

export type SourceSummaryRow = {
  key: string;
  label: string;
  connected: boolean;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
};

export async function getSourceSummary(): Promise<SourceSummaryRow[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, source");
  if (campaignsErr) throw campaignsErr;

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select("campaign_id, sent, delivered, opened, clicked, pulled_at")
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const sourceByCampaign = new Map(
    (campaigns ?? []).map((c) => [c.id, c.source])
  );
  const latestByCampaign = new Map<number, (typeof snapshots)[number]>();
  for (const row of snapshots ?? []) {
    if (!latestByCampaign.has(row.campaign_id)) {
      latestByCampaign.set(row.campaign_id, row);
    }
  }

  const woodpecker: SourceSummaryRow = {
    key: "woodpecker",
    label: "Woodpecker (cold email)",
    connected: true,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
  };
  for (const [campaignId, s] of latestByCampaign) {
    if (sourceByCampaign.get(campaignId) === "woodpecker") {
      woodpecker.sent += s.sent;
      woodpecker.delivered += s.delivered;
      woodpecker.opened += s.opened;
      woodpecker.clicked += s.clicked;
    }
  }

  const placeholders: SourceSummaryRow[] = [
    {
      key: "keap_broadcast",
      label: "Keap Broadcasts",
      connected: false,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    },
    {
      key: "keap_automation_lead_marketing",
      label: "Keap Automations — Lead Marketing",
      connected: false,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    },
    {
      key: "keap_automation_customer_comms",
      label: "Keap Automations — Customer/Comms",
      connected: false,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
    },
  ];

  return [woodpecker, ...placeholders];
}

export async function getCampaignsWithStats(): Promise<CampaignWithStats[]> {
  const supabase = supabaseServer();

  const { data: campaigns, error: campaignsErr } = await supabase
    .from("campaigns")
    .select("id, source, name, owner, status")
    .order("name");
  if (campaignsErr) throw campaignsErr;
  if (!campaigns?.length) return [];

  const { data: snapshots, error: snapshotsErr } = await supabase
    .from("campaign_stats_snapshot")
    .select(
      "campaign_id, sent, delivered, opened, opened_rate, clicked, bounced, bounce_rate, responded, responded_rate, interested_yes, interested_maybe, pulled_at"
    )
    .order("pulled_at", { ascending: false });
  if (snapshotsErr) throw snapshotsErr;

  const latestByCampaign = new Map<number, (typeof snapshots)[number]>();
  for (const row of snapshots ?? []) {
    if (!latestByCampaign.has(row.campaign_id)) {
      latestByCampaign.set(row.campaign_id, row);
    }
  }

  return campaigns.map((c) => {
    const s = latestByCampaign.get(c.id);
    return {
      ...c,
      stats: s
        ? {
            sent: s.sent,
            delivered: s.delivered,
            opened: s.opened,
            opened_rate: s.opened_rate,
            clicked: s.clicked,
            bounced: s.bounced,
            bounce_rate: s.bounce_rate,
            responded: s.responded,
            responded_rate: s.responded_rate,
            interested_yes: s.interested_yes,
            interested_maybe: s.interested_maybe,
            pulled_at: s.pulled_at,
          }
        : null,
    };
  });
}
