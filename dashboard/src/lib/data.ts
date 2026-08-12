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
