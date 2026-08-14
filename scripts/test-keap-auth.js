// One-off connectivity test for the Keap Service Account Key.
require('dotenv').config();

const BASE = 'https://api.infusionsoft.com/crm/rest/v1';

async function hit(path) {
  const key = process.env.KEAP_API_KEY;
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log(`\n=== ${path} ===`);
  console.log('Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Body (first 800 chars):', text.slice(0, 800));
}

async function main() {
  if (!process.env.KEAP_API_KEY) {
    console.error('Missing KEAP_API_KEY in .env');
    process.exit(1);
  }
  await hit('/account/profile');
  await hit('/campaigns');
  await hit('/emails');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
