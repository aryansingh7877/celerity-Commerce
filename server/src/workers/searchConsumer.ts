import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { createConsumer, getKafkaTopic } from '../services/kafka.js';
import { deleteProductIndex, indexProduct, ensureProductIndex } from '../services/search.js';

async function markProcessed(eventId: string) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO processed_events (event_id, consumer_group) VALUES ($1, 'search')
     ON CONFLICT (event_id) DO NOTHING`,
    [eventId]
  );
}

async function alreadyProcessed(eventId: string) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT 1 FROM processed_events WHERE event_id = $1 AND consumer_group = 'search'`,
    [eventId]
  );
  return Boolean(res.rowCount);
}

async function handleEvent(evt: {
  event_id: string;
  event_type: string;
  entity_id?: string;
}) {
  if (await alreadyProcessed(evt.event_id)) return;
  const pool = getPool();
  if (evt.event_type === 'product.deleted' && evt.entity_id) {
    await deleteProductIndex(evt.entity_id);
    await markProcessed(evt.event_id);
    return;
  }
  if (
    ['product.created', 'product.updated', 'inventory.updated'].includes(evt.event_type) &&
    evt.entity_id
  ) {
    const res = await pool.query('SELECT * FROM products WHERE id = $1', [evt.entity_id]);
    const p = res.rows[0];
    if (p) {
      await indexProduct({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
        price: Number(p.offer_price ?? p.price),
        specs: p.specs,
        active: p.active,
      });
    }
    await markProcessed(evt.event_id);
  }
}

async function main() {
  await ensureProductIndex().catch((e) => console.warn('[search-consumer] index ensure', e.message));
  const consumer = await createConsumer('celerity-search');
  if (!consumer) {
    console.warn('[search-consumer] Kafka not configured — idle');
    setInterval(() => undefined, 60_000);
    return;
  }
  await consumer.subscribe({ topic: getKafkaTopic(), fromBeginning: false });
  console.log('[search-consumer] listening on', getKafkaTopic());
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const evt = JSON.parse(message.value.toString());
        await handleEvent(evt);
      } catch (err) {
        console.error('[search-consumer] failed', err);
      }
    },
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
