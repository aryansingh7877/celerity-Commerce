import { getPool } from '../db/pool.js';
import { env } from '../config/env.js';
import { getStoreIdByCity } from './inventory.js';

export async function findAlternatives(input: {
  productId: string;
  city: string;
  limit?: number;
}) {
  const pool = getPool();
  const storeId = await getStoreIdByCity(pool, input.city);
  const deadDays = env.DEAD_STOCK_DAYS;

  const base = await pool.query(
    `SELECT id, name, brand, category, price, offer_price, image_url
     FROM products WHERE id = $1`,
    [input.productId]
  );
  if (!base.rows[0]) return { product: null, alternatives: [] };
  const product = base.rows[0];
  const price = Number(product.offer_price ?? product.price);
  const low = price * 0.8;
  const high = price * 1.2;

  const res = await pool.query(
    `SELECT p.id, p.name, p.brand, p.category, p.price, p.offer_price, p.image_url, p.sku,
            i.stock,
            i.last_sold_at,
            CASE
              WHEN i.stock > 0 AND (i.last_sold_at IS NULL OR i.last_sold_at < now() - ($6::text || ' days')::interval)
              THEN true ELSE false
            END AS is_dead_stock
     FROM products p
     JOIN inventory i ON i.product_id = p.id AND i.store_id = $2
     WHERE p.active = true
       AND p.id <> $1
       AND p.category = $3
       AND i.stock > 0
       AND COALESCE(p.offer_price, p.price) BETWEEN $4 AND $5
     ORDER BY
       CASE
         WHEN i.stock > 0 AND (i.last_sold_at IS NULL OR i.last_sold_at < now() - ($6::text || ' days')::interval)
         THEN 0 ELSE 1
       END,
       ABS(COALESCE(p.offer_price, p.price) - $7)
     LIMIT $8`,
    [
      input.productId,
      storeId,
      product.category,
      low,
      high,
      String(deadDays),
      price,
      input.limit ?? 6,
    ]
  );

  return {
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      price,
    },
    alternatives: res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      brand: r.brand,
      sku: r.sku,
      category: r.category,
      price: Number(r.offer_price ?? r.price),
      imageUrl: r.image_url,
      stock: Number(r.stock),
      isDeadStock: Boolean(r.is_dead_stock),
      reason: r.is_dead_stock
        ? 'Same category · in stock · prioritized dead-stock clearance'
        : 'Same category · price within ±20% · in stock at your hub',
    })),
  };
}
