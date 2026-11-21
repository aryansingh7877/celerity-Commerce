import { 
  supabase, 
  DatabaseProduct, 
  DatabaseStore, 
  DatabaseInventory, 
  DatabaseBasket, 
  DatabaseBasketItem,
  DatabaseRescueEvent 
} from './client';

/**
 * Fetch all stores / fulfillment hubs
 */
export async function getStores(): Promise<DatabaseStore[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name');

  if (error) {
    console.warn('Error fetching stores:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Fetch all products from catalog
 */
export async function getProducts(): Promise<DatabaseProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category');

  if (error) {
    console.warn('Error fetching products:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Get stock availability for a product in a specific store
 */
export async function getProductInventory(productId: string, storeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('inventory')
    .select('stock_quantity')
    .eq('product_id', productId)
    .eq('store_id', storeId)
    .single();

  if (error || !data) return 0;
  return data.stock_quantity;
}

/**
 * Get or initialize active basket for an authenticated user
 */
export async function getOrCreateUserBasket(userId: string): Promise<DatabaseBasket | null> {
  try {
    // 1. Look for existing active basket
    const { data: existing, error } = await supabase
      .from('baskets')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'rescued'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // 2. Create new active basket if none exists
    const { data: newBasket, error: insertError } = await supabase
      .from('baskets')
      .insert({
        user_id: userId,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.warn('Basket creation error:', insertError.message);
      return null;
    }

    return newBasket;
  } catch (err) {
    console.error('getOrCreateUserBasket error:', err);
    return null;
  }
}

/**
 * Fetch items in a basket with joined product details
 */
export async function getBasketItems(basketId: string): Promise<DatabaseBasketItem[]> {
  const { data, error } = await supabase
    .from('basket_items')
    .select(`
      *,
      product:products(*)
    `)
    .eq('basket_id', basketId)
    .order('created_at');

  if (error) {
    console.warn('Error fetching basket items:', error.message);
    return [];
  }

  return (data as DatabaseBasketItem[]) || [];
}

/**
 * Perform Smart Basket Rescue on a specific basket item
 */
export async function rescueBasketItem(
  basketId: string,
  unavailableProductId: string,
  replacementProductId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Attempt RPC call first if migration was run
    const { data, error: rpcError } = await supabase.rpc('rescue_basket_item', {
      p_basket_id: basketId,
      p_unavailable_product_id: unavailableProductId,
      p_replacement_product_id: replacementProductId
    });

    if (!rpcError && data?.success) {
      return { success: true };
    }

    // Client-side fallback if RPC is not present
    // 1. Delete unavailable item
    await supabase
      .from('basket_items')
      .delete()
      .eq('basket_id', basketId)
      .eq('product_id', unavailableProductId);

    // 2. Get price of replacement product
    const { data: replProd } = await supabase
      .from('products')
      .select('price')
      .eq('id', replacementProductId)
      .single();

    const price = replProd?.price || 19.00;

    // 3. Insert replacement item
    await supabase
      .from('basket_items')
      .insert({
        basket_id: basketId,
        product_id: replacementProductId,
        quantity: 1,
        price
      });

    // 4. Update basket status
    await supabase
      .from('baskets')
      .update({ status: 'rescued', updated_at: new Date().toISOString() })
      .eq('id', basketId);

    // 5. Record rescue event
    await supabase
      .from('rescue_events')
      .insert({
        basket_id: basketId,
        unavailable_product_id: unavailableProductId,
        replacement_product_id: replacementProductId,
        status: 'completed'
      });

    return { success: true };
  } catch (err: any) {
    console.error('rescueBasketItem error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch rescue event history for a basket
 */
export async function getRescueHistory(basketId: string): Promise<DatabaseRescueEvent[]> {
  const { data, error } = await supabase
    .from('rescue_events')
    .select(`
      *,
      unavailable_product:products!rescue_events_unavailable_product_id_fkey(*),
      replacement_product:products!rescue_events_replacement_product_id_fkey(*)
    `)
    .eq('basket_id', basketId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching rescue events:', error.message);
    return [];
  }

  return (data as DatabaseRescueEvent[]) || [];
}
