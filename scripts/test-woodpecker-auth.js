// One-off connectivity test: confirms auth scheme + endpoint before building the real pipeline.
require('dotenv').config();

async function main() {
  const key = process.env.WOODPECKER_API_KEY;
  if (!key) {
    console.error('Missing WOODPECKER_API_KEY in .env');
    process.exit(1);
  }

  const listUrl = 'https://api.woodpecker.co/rest/v1/campaign_list';
  const listRes = await fetch(listUrl, { headers: { 'x-api-key': key } });
  console.log('LIST status:', listRes.status, listRes.statusText);
  const listText = await listRes.text();
  console.log('LIST body (first 500 chars):', listText.slice(0, 500));

  const statsUrl = 'https://api.woodpecker.co/rest/v1/campaign_list?id=1589950';
  const statsRes = await fetch(statsUrl, { headers: { 'x-api-key': key } });
  console.log('\nSTATS status:', statsRes.status, statsRes.statusText);
  const statsText = await statsRes.text();
  console.log('STATS body (first 1500 chars):', statsText.slice(0, 1500));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
