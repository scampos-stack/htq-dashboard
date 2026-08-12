// Pulls live campaign stats from the Woodpecker API and upserts into Supabase.
// Usage: node scripts/import-woodpecker-live.js
//
// Auth: x-api-key header (confirmed against v1 /campaign_list).
// Note: this endpoint returns a cumulative snapshot per campaign, not a
// per-day/per-mailbox breakdown -> only feeds campaign_stats_snapshot.
// campaign_stats_daily still comes from the Woodpecker CSV export
// (scripts/import-woodpecker.js) until a per-day API endpoint is confirmed.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API_BASE = 'https://api.woodpecker.co/rest/v1';

async function wpFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-api-key': process.env.WOODPECKER_API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Woodpecker API ${path} -> ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, WOODPECKER_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env');
    process.exit(1);
  }
  if (!WOODPECKER_API_KEY) {
    console.error('Missing WOODPECKER_API_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const campaignList = await wpFetch('/campaign_list');
  console.log(`Found ${campaignList.length} campaigns.`);

  const campaignsPayload = campaignList.map((c) => ({
    source: 'woodpecker',
    external_id: String(c.id),
    name: c.name,
    owner: c.from_name || null,
    status: c.status || null,
  }));

  const { data: upsertedCampaigns, error: campaignErr } = await supabase
    .from('campaigns')
    .upsert(campaignsPayload, { onConflict: 'source,external_id' })
    .select('id, external_id');
  if (campaignErr) throw campaignErr;

  const campaignIdByExternalId = new Map(
    upsertedCampaigns.map((c) => [c.external_id, c.id])
  );

  const snapshotPayload = [];
  for (const c of campaignList) {
    const [detail] = await wpFetch(`/campaign_list?id=${c.id}`);
    const s = detail.stats;
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
    .from('campaign_stats_snapshot')
    .upsert(snapshotPayload, { onConflict: 'campaign_id,step,version,pulled_at' });
  if (snapshotErr) throw snapshotErr;

  console.log(`Upserted ${campaignsPayload.length} campaigns and ${snapshotPayload.length} live snapshot rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
