import type { DbClient } from '../db/pool.js';

export async function enqueueOutbox(
  client: DbClient,
  input: {
    eventType: string;
    entityId?: string | null;
    city?: string | null;
    payload: Record<string, unknown>;
  }
): Promise<string> {
  const res = await client.query<{ id: string }>(
    `INSERT INTO outbox (topic, event_type, entity_id, city, payload)
     VALUES ($1, $1, $2, $3, $4::jsonb)
     RETURNING id`,
    [input.eventType, input.entityId ?? null, input.city ?? null, JSON.stringify(input.payload)]
  );
  return res.rows[0].id;
}

export async function claimOutbox(client: DbClient, limit: number) {
  const res = await client.query(
    `WITH cte AS (
       SELECT id FROM outbox
       WHERE status = 'pending'
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE outbox o
     SET status = 'processing', attempts = attempts + 1
     FROM cte
     WHERE o.id = cte.id
     RETURNING o.*`,
    [limit]
  );
  return res.rows;
}

export async function completeOutbox(
  client: DbClient,
  id: string,
  ok: boolean,
  error?: string
) {
  if (ok) {
    await client.query(
      `UPDATE outbox SET status = 'published', published_at = now(), last_error = NULL WHERE id = $1`,
      [id]
    );
    return;
  }
  await client.query(
    `UPDATE outbox
     SET status = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END,
         last_error = $2
     WHERE id = $1`,
    [id, error ?? 'unknown']
  );
}
