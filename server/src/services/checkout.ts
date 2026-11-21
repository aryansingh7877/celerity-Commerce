import { getPool, ensureDbAccess } from '../db/pool.js';
import { HttpError } from '../middleware/errors.js';
import { getStoreIdByCity } from './inventory.js';

export type CartLineInput = { productId: string; quantity: number };

export async function validateCart(city: string, lines: CartLineInput[]) {
  await ensureDbAccess();
  const pool = getPool();
  const storeId = await getStoreIdByCity(pool, city);
  const results = [];
  for (const line of lines) {
    const res = await pool.query(
      `SELECT p.id, p.name, p.sku, p.price, p.offer_price, p.image_url, p.category, p.brand,
              COALESCE(i.stock, i.stock_quantity, 0) AS stock
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.store_id = $2
       WHERE p.id = $1 AND COALESCE(p.active, true) = true`,
      [line.productId, storeId]
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      results.push({
        productId: line.productId,
        ok: false,
        reason: 'PRODUCT_NOT_FOUND',
      });
      continue;
    }
    const unitPrice = Number(row.offer_price ?? row.price);
    const stock = Number(row.stock);
    const ok = stock >= line.quantity;
    results.push({
      productId: row.id,
      name: row.name,
      sku: row.sku,
      brand: row.brand,
      category: row.category,
      imageUrl: row.image_url,
      unitPrice,
      quantity: line.quantity,
      stock,
      ok,
      reason: ok ? null : 'INSUFFICIENT_STOCK',
    });
  }
  return { city, storeId, lines: results, allOk: results.every((r) => r.ok) };
}

export async function createOrder(input: {
  userId: string;
  city: string;
  lines: CartLineInput[];
  shipping?: number;
}) {
  await ensureDbAccess();
  const pool = getPool();
  const linesJson = JSON.stringify(input.lines).replace(/'/g, "''");
  const city = input.city === 'Bangalore' ? 'Bengaluru' : input.city;
  const shipping = input.shipping ?? 99;

  try {
    const res = await pool.query(
      `SELECT create_commerce_order(
         $1::uuid,
         $2::text,
         $3::jsonb,
         $4::numeric
       ) AS result`,
      [input.userId, city, input.lines, shipping]
    );
    const result = (res.rows[0] as { result?: unknown } | undefined)?.result;
    if (!result) throw new Error('empty order result');
    return result as { order: Record<string, unknown>; items: unknown[] };
  } catch (err) {
    const msg = (err as Error).message || '';
    if (/STOCK_CONFLICT/i.test(msg)) {
      throw new HttpError(409, 'STOCK_CONFLICT', { detail: msg });
    }
    // fallback bind path if jsonb param binding fails
    try {
      const res = await pool.query(
        `SELECT create_commerce_order(
           '${input.userId}'::uuid,
           '${city.replace(/'/g, "''")}'::text,
           '${linesJson}'::jsonb,
           ${shipping}::numeric
         ) AS result`
      );
      const result = (res.rows[0] as { result?: unknown } | undefined)?.result;
      if (!result) throw new Error('empty order result');
      return result as { order: Record<string, unknown>; items: unknown[] };
    } catch (err2) {
      const msg2 = (err2 as Error).message || '';
      if (/STOCK_CONFLICT/i.test(msg2)) {
        throw new HttpError(409, 'STOCK_CONFLICT', { detail: msg2 });
      }
      throw err2;
    }
  }
}
