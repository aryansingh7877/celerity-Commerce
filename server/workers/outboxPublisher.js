/**
 * Local outbox worker — same pipeline as Edge Function `process-outbox`.
 * Uses Supabase service role to claim / complete outbox rows.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run worker:outbox
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const intervalMs = Number(process.env.OUTBOX_POLL_MS || 3000);
const batch = Number(process.env.OUTBOX_BATCH || 20);

if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function handleTopic(row) {
  // Extend with webhooks / email / search reindex as needed.
  console.log(`[outbox] ${row.topic}`, JSON.stringify(row.payload));
}

async function tick() {
  const { data: rows, error } = await supabase.rpc('claim_outbox', { p_limit: batch });
  if (error) {
    console.error('[outbox] claim failed', error.message);
    return;
  }
  if (!rows?.length) return;

  for (const row of rows) {
    try {
      await handleTopic(row);
      await supabase.rpc('complete_outbox', { p_id: row.id, p_ok: true });
    } catch (err) {
      console.error('[outbox] handle failed', row.id, err.message);
      await supabase.rpc('complete_outbox', {
        p_id: row.id,
        p_ok: false,
        p_error: err.message,
      });
    }
  }
  console.log(`[outbox] processed ${rows.length}`);
}

console.log(`[outbox] polling every ${intervalMs}ms`);
await tick();
setInterval(() => {
  tick().catch((err) => console.error(err));
}, intervalMs);
