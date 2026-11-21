/**
 * Smoke checks against a running API (no secrets printed).
 * Usage: npx tsx server/scripts/api-smoke.ts
 */
const base = process.env.VITE_API_URL || process.env.API_URL || 'http://127.0.0.1:4000';

async function main() {
  const health = await fetch(`${base}/api/health`);
  const body = await health.json();
  console.log('health', health.status, {
    ok: body.ok,
    database: body.database?.ok,
    kafkaConfigured: body.kafka?.configured,
    opensearch: body.opensearch?.ok,
    whatsapp: body.whatsapp?.configured,
  });

  const products = await fetch(`${base}/api/products?city=Bengaluru&pageSize=5`);
  console.log('products', products.status, 'search-mode', products.headers.get('X-Search-Mode'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
