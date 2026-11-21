import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const { product_id, store_id, delta, reason } = await req.json();
    if (!product_id || !store_id || typeof delta !== 'number') {
      return jsonResponse({ error: 'product_id, store_id, delta required' }, 400);
    }

    const supabase = userClient(req);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
    }

    const { data, error } = await supabase.rpc('adjust_inventory', {
      p_product_id: product_id,
      p_store_id: store_id,
      p_delta: delta,
      p_reason: reason || 'adjust',
      p_actor_id: authData.user.id,
    });

    if (error) {
      return jsonResponse({ error: error.message, code: 'ADJUST_FAILED' }, 400);
    }

    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
