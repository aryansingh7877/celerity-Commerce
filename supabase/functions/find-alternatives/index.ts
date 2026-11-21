import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let product_id = url.searchParams.get('product_id');
    let store_id = url.searchParams.get('store_id');
    let limit = Number(url.searchParams.get('limit') || 5);

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      product_id = body.product_id ?? product_id;
      store_id = body.store_id ?? store_id;
      limit = Number(body.limit ?? limit);
    }

    if (!product_id) {
      return jsonResponse({ error: 'product_id required' }, 400);
    }

    const supabase = userClient(req);
    const { data, error } = await supabase.rpc('find_alternatives', {
      p_product_id: product_id,
      p_store_id: store_id,
      p_limit: limit,
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
