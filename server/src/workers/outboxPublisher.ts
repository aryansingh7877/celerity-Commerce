import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { claimOutbox, completeOutbox } from '../services/outbox.js';
import { createProducer, getKafkaTopic } from '../services/kafka.js';

async function tick() {
  const pool = getPool();
  const producer = await createProducer();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rows = await claimOutbox(client, env.OUTBOX_BATCH);
    await client.query('COMMIT');

    for (const row of rows) {
      const payload = {
        event_id: row.event_id,
        event_type: row.event_type,
        entity_id: row.entity_id,
        city: row.city,
        timestamp: row.created_at,
        payload: row.payload,
      };
      try {
        if (!producer) {
          console.log('[outbox] Kafka not configured — logging event', row.event_type, row.event_id);
          await completeOutbox(pool, row.id, true);
          continue;
        }
        await producer.send({
          topic: getKafkaTopic(),
          messages: [{ key: String(row.entity_id ?? row.id), value: JSON.stringify(payload) }],
        });
        await completeOutbox(pool, row.id, true);
      } catch (err) {
        await completeOutbox(pool, row.id, false, (err as Error).message);
      }
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[outbox] tick failed', err);
  } finally {
    client.release();
    if (producer) await producer.disconnect().catch(() => undefined);
  }
}

console.log(`Outbox publisher started (poll ${env.OUTBOX_POLL_MS}ms)`);
setInterval(() => {
  tick().catch(console.error);
}, env.OUTBOX_POLL_MS);
tick().catch(console.error);
