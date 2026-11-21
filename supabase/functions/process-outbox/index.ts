import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';

type OutboxRow = {
  id: string;
  topic: string;
  payload: Record<string, unknown>;
  attempts: number;
};

/**
 * Service-role worker: claim pending outbox rows and mark them published.
 * Hook real fans-outs (email, search reindex, Slack) inside handleTopic().
 */
async function handleTopic(row: OutboxRow): Promise<void> {
  switch (row.topic) {
    case 'inventory.changed':
    case 'restock.requested':
    case 'checkout.conflict':
    case 'checkout.completed':
      // Pipeline sink: structured log for now — extend with webhooks / queues.
      console.log(JSON.stringify({ topic: row.topic, id: row.id, payload: row.payload }));
      break;
    default:
      console.log(JSON.stringify({ topic: row.topic, id: row.id, note: 'unhandled' }));
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit ?? 20);

    const supabase = serviceClient();
    const { data: rows, error } = await supabase.rpc('claim_outbox', { p_limit: limit });
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    const batch = (rows || []) as OutboxRow[];
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const row of batch) {
      try {
        await handleTopic(row);
        await supabase.rpc('complete_outbox', { p_id: row.id, p_ok: true });
        results.push({ id: row.id, ok: true });
      } catch (err) {
        const message = (err as Error).message;
        await supabase.rpc('complete_outbox', {
          p_id: row.id,
          p_ok: false,
          p_error: message,
        });
        results.push({ id: row.id, ok: false, error: message });
      }
    }

    return jsonResponse({
      processed: results.length,
      results,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
