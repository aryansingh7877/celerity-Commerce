import { getPool } from '../db/pool.js';
import { createConsumer, getKafkaTopic } from '../services/kafka.js';
import { sendRestockWhatsApp, logNotification } from '../services/whatsapp.js';
import { env } from '../config/env.js';

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

  const inv = await pool.query(
    `SELECT i.*, s.city, p.name AS product_name, p.sku
     FROM inventory i
     JOIN stores s ON s.id = i.store_id
     JOIN products p ON p.id = i.product_id
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

  const suggested = Math.max(row.reorder_threshold * 2 - row.stock, row.reorder_threshold);

  const supplier = await pool.query(
    `SELECT s.* FROM product_suppliers ps
     JOIN suppliers s ON s.id = ps.supplier_id
     WHERE ps.product_id = $1
     ORDER BY ps.is_primary DESC, s.created_at
     LIMIT 1`,
    [row.product_id]
  );
  const sup = supplier.rows[0] ?? null;

  const existing = await pool.query(
    `SELECT id FROM restock_requests WHERE product_id = $1 AND store_id = $2 AND status = 'open'`,
    [row.product_id, row.store_id]
  );

  let restockId: string;
  if (existing.rows[0]) {
    restockId = existing.rows[0].id;
    await pool.query(
      `UPDATE restock_requests SET
         current_stock = $2, reorder_threshold = $3, suggested_qty = $4,
         supplier_id = COALESCE($5, supplier_id), updated_at = now()
       WHERE id = $1`,
      [restockId, row.stock, row.reorder_threshold, suggested, sup?.id ?? null]
    );
  } else {
    const inserted = await pool.query(
      `INSERT INTO restock_requests
        (product_id, store_id, supplier_id, current_stock, reorder_threshold, suggested_qty, whatsapp_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        row.product_id,
        row.store_id,
        sup?.id ?? null,
        row.stock,
        row.reorder_threshold,
        suggested,
        env.hasWhatsApp ? 'pending' : 'pending_configuration',
      ]
    );
    restockId = inserted.rows[0].id;
    await pool.query(
      `INSERT INTO outbox (event_type, entity_id, city, payload)
       VALUES ('restock.requested', $1, $2, $3::jsonb)`,
      [
        restockId,
        row.city,
        JSON.stringify({ restock_request_id: restockId, product_id: row.product_id }),
      ]
    );
  }

  if (!sup?.whatsapp_e164) {
    await logNotification({
      restockRequestId: restockId,
      supplierId: sup?.id,
      status: 'pending_configuration',
      failureReason: 'No supplier WhatsApp number',
    });
    await pool.query(
      `UPDATE restock_requests SET whatsapp_status = 'pending_configuration' WHERE id = $1`,
      [restockId]
    );
    await markProcessed(evt.event_id);
    return;
  }

  const result = await sendRestockWhatsApp({
    toE164: sup.whatsapp_e164,
    supplierName: sup.name,
    productName: row.product_name,
    sku: row.sku,
    city: row.city,
    stock: row.stock,
    reorderThreshold: row.reorder_threshold,
    suggestedQty: suggested,
  });

  if (result.ok) {
    await logNotification({
      restockRequestId: restockId,
      supplierId: sup.id,
      status: 'submitted',
      providerMessageId: result.messageId,
      providerResponse: result.response,
    });
    await pool.query(
      `UPDATE restock_requests SET whatsapp_status = 'submitted', updated_at = now() WHERE id = $1`,
      [restockId]
    );
  } else {
    await logNotification({
      restockRequestId: restockId,
      supplierId: sup.id,
      status: result.status,
      failureReason: result.reason,
      providerResponse: result.response,
    });
    await pool.query(
      `UPDATE restock_requests SET whatsapp_status = $2, updated_at = now() WHERE id = $1`,
      [restockId, result.status]
    );
  }

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
