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
    const { basket_id, store_id } = await req.json();
    if (!basket_id || !store_id) {
      return jsonResponse({ error: 'basket_id and store_id required' }, 400);
    }

    const supabase = userClient(req);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return jsonResponse({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401);
    }

    const { data, error } = await supabase.rpc('checkout_basket', {
      p_basket_id: basket_id,
      p_store_id: store_id,
    });

    if (error) {
      return jsonResponse({ error: error.message, code: 'CHECKOUT_FAILED' }, 400);
    }

    const payload = data as { success?: boolean; code?: string };
    const status = payload?.success === false ? 409 : 200;
    return jsonResponse(data, status);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
