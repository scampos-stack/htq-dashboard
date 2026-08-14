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
  console.log(text.slice(0, 2500));
}

async function main() {
  await hit('/campaigns/9');
  await hit('/emails?limit=3');
  await hit('/campaigns?limit=3');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
