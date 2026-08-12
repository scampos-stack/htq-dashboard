// Imports Woodpecker CSV exports into Supabase.
// Usage: node scripts/import-woodpecker.js
//
// Reads:
//   samples/woodpecker_complete_statistics_per_campaign.csv -> campaign_stats_snapshot
//   samples/woodpecker_open_rate_per_campaign.csv           -> campaign_stats_daily
//
// Requires SUPABASE_URL and SUPABASE_SECRET_KEY in .env (service-role key,
// needed to bypass RLS for a trusted server-side import).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const SAMPLES_DIR = path.join(__dirname, '..', 'samples');

function readCsv(filename) {
  const filePath = path.join(SAMPLES_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
}

function toNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || SUPABASE_SECRET_KEY.startsWith('REPLACE_ME')) {
    console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY. Fill in .env first.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const snapshotRows = readCsv('woodpecker_complete_statistics_per_campaign.csv');
  const dailyRows = readCsv('woodpecker_open_rate_per_campaign.csv');

  // 1. Upsert campaigns (dimension) from whichever rows we see them in.
  const campaignsByExternalId = new Map();
  for (const row of snapshotRows) {
    campaignsByExternalId.set(row.campaign_id, {
      source: 'woodpecker',
      external_id: row.campaign_id,
      name: row.campaign,
      owner: row.campaign_owner?.trim() || null,
      status: row.campaign_status || null,
    });
  }
  for (const row of dailyRows) {
    if (!campaignsByExternalId.has(row.campaign_id)) {
      campaignsByExternalId.set(row.campaign_id, {
        source: 'woodpecker',
        external_id: row.campaign_id,
        name: row.campaign,
      });
    }
  }

  const campaigns = [...campaignsByExternalId.values()];
  const { data: upsertedCampaigns, error: campaignErr } = await supabase
    .from('campaigns')
    .upsert(campaigns, { onConflict: 'source,external_id' })
    .select('id, external_id');

  if (campaignErr) throw campaignErr;

  const campaignIdByExternalId = new Map(
    upsertedCampaigns.map((c) => [c.external_id, c.id])
  );

  // 2. Upsert snapshot stats.
  const snapshotPayload = snapshotRows.map((row) => ({
    campaign_id: campaignIdByExternalId.get(row.campaign_id),
    step: toNum(row.step),
    version: row.version || null,
    sent: toNum(row.sent) ?? 0,
    bounced: toNum(row.bounced) ?? 0,
    bounce_rate: toNum(row.bounce_rate),
    opened: toNum(row.opened) ?? 0,
    opened_rate: toNum(row.opened_rate),
    clicked: toNum(row.clicked) ?? 0,
    opt_out: toNum(row.opt_out) ?? 0,
    opt_out_rate: toNum(row.opt_out_rate),
    delivered: toNum(row.delivered) ?? 0,
    responded: toNum(row.responded) ?? 0,
    responded_rate: toNum(row.responded_rate),
    interested_yes: toNum(row.interested_yes),
    interested_maybe: toNum(row.interested_maybe),
    interested_no: toNum(row.interested_no),
  }));

  const { error: snapshotErr } = await supabase
    .from('campaign_stats_snapshot')
    .upsert(snapshotPayload, { onConflict: 'campaign_id,step,version,pulled_at' });
  if (snapshotErr) throw snapshotErr;

  // 3. Upsert daily/mailbox stats.
  const dailyPayload = dailyRows.map((row) => ({
    campaign_id: campaignIdByExternalId.get(row.campaign_id),
    sent_date: row.sent_date,
    mailbox: row.mailbox || null,
    step_number: toNum(row.step_number),
    version: row.version || null,
    sent: toNum(row.sent) ?? 0,
    delivered: toNum(row.delivered) ?? 0,
    opened: toNum(row.opened) ?? 0,
    open_rate: toNum(row.open_rate),
  }));

  const { error: dailyErr } = await supabase
    .from('campaign_stats_daily')
    .upsert(dailyPayload, { onConflict: 'campaign_id,sent_date,mailbox,step_number,version' });
  if (dailyErr) throw dailyErr;

  console.log(`Imported ${campaigns.length} campaigns, ${snapshotPayload.length} snapshot rows, ${dailyPayload.length} daily rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
