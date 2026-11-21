import { getPool } from '../db/pool.js';
import { createConsumer, getKafkaTopic } from '../services/kafka.js';
import { notifySupplierOnStockDepletion } from '../services/supplierNotify.js';

async function markProcessed(eventId: string) {
  await getPool().query(
    `INSERT INTO processed_events (event_id, consumer_group) VALUES ($1, 'inventory-restock')
     ON CONFLICT (event_id) DO NOTHING`,
    [eventId]
  );
}

async function alreadyProcessed(eventId: string) {
  const res = await getPool().query(
    `SELECT 1 FROM processed_events WHERE event_id = $1 AND consumer_group = 'inventory-restock'`,
    [eventId]
  );
  return Boolean(res.rowCount);
}

async function handleLowStock(evt: {
  event_id: string;
  event_type: string;
  payload: {
    product_id: string;
    store_id: string;
    stock?: number;
    reorder_threshold?: number;
  };
}) {
  if (await alreadyProcessed(evt.event_id)) return;
  const pool = getPool();

  const inv = await pool.query<{
    product_id: string;
    store_id: string;
    stock: number;
    reorder_threshold: number;
    city: string;
  }>(
    `SELECT i.product_id, i.store_id, i.stock, i.reorder_threshold, s.city
     FROM inventory i
     JOIN stores s ON s.id = i.store_id
     WHERE i.product_id = $1 AND i.store_id = $2`,
    [evt.payload.product_id, evt.payload.store_id]
  );
  const row = inv.rows[0];
  if (!row) {
    await markProcessed(evt.event_id);
    return;
  }

  // Re-verify thresholds from DB (never trust event alone)
  if (row.stock > row.reorder_threshold && evt.event_type !== 'inventory.out_of_stock') {
    await markProcessed(evt.event_id);
    return;
  }

  const reason = evt.event_type === 'inventory.out_of_stock' || row.stock === 0
    ? 'out_of_stock'
    : 'low_stock';

  // Shared path with API — DB lock prevents double WhatsApp
  await notifySupplierOnStockDepletion({
    productId: row.product_id,
    storeId: row.store_id,
    city: row.city,
    stock: row.stock,
    reorderThreshold: row.reorder_threshold,
    reason,
  });

  await markProcessed(evt.event_id);
}

async function main() {
  const consumer = await createConsumer('celerity-inventory-restock');
  if (!consumer) {
    console.warn('[inventory-consumer] Kafka not configured — idle');
    setInterval(() => undefined, 60_000);
    return;
  }
  await consumer.subscribe({ topic: getKafkaTopic(), fromBeginning: false });
  console.log('[inventory-consumer] listening on', getKafkaTopic());
  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const evt = JSON.parse(message.value.toString());
        if (
          evt.event_type === 'inventory.low_stock' ||
          evt.event_type === 'inventory.out_of_stock'
        ) {
          await handleLowStock(evt);
        }
      } catch (err) {
        console.error('[inventory-consumer]', err);
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
