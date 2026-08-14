// Pulls live Keap automations (campaigns) into Supabase.
// Usage: node scripts/import-keap-live.js
//
// Auth: Authorization: Bearer <Service Account Key> against REST v1.
// Note: only contact-flow volume (active/completed contacts) is available —
// Keap's API has no per-email open/click stats linked to automations.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API_BASE = 'https://api.infusionsoft.com/crm/rest/v1';

const CUSTOMER_COMMS_KEYWORDS = [
  'onboard', 'welcome', 'renewal', 'support', 'service',
  'account', 'activate', 'receipt', 'confirmation', 'agent enrolled',
];

function classify(name) {
  const lower = name.toLowerCase();
  return CUSTOMER_COMMS_KEYWORDS.some((kw) => lower.includes(kw))
    ? 'automation_customer_comms'
    : 'automation_lead_marketing';
}

async function keapFetch(path) {
  const key = process.env.KEAP_API_KEY;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Keap API ${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, KEAP_API_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY in .env');
    process.exit(1);
  }
  if (!KEAP_API_KEY) {
    console.error('Missing KEAP_API_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  const data = await keapFetch('/campaigns?limit=1000');
  const campaigns = data.campaigns ?? [];
  console.log(`Found ${campaigns.length} Keap automations.`);

  const campaignsPayload = campaigns.map((c) => ({
    source: 'keap',
    external_id: String(c.id),
    name: c.name,
    status: c.published_status ? 'PUBLISHED' : 'UNPUBLISHED',
    category: classify(c.name),
  }));

  const { data: upserted, error: campaignErr } = await supabase
    .from('campaigns')
    .upsert(campaignsPayload, { onConflict: 'source,external_id' })
    .select('id, external_id');
  if (campaignErr) throw campaignErr;

  const idByExternalId = new Map(upserted.map((c) => [c.external_id, c.id]));

  const snapshotPayload = campaigns.map((c) => ({
    campaign_id: idByExternalId.get(String(c.id)),
    step: null,
    version: null,
    active_contacts: c.active_contact_count ?? 0,
    completed_contacts: c.completed_contact_count ?? 0,
  }));

  const { error: snapshotErr } = await supabase
    .from('campaign_stats_snapshot')
    .upsert(snapshotPayload, { onConflict: 'campaign_id,step,version,pulled_at' });
  if (snapshotErr) throw snapshotErr;

  console.log(`Upserted ${campaignsPayload.length} campaigns and ${snapshotPayload.length} snapshot rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
