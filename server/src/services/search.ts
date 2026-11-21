import { Client } from '@opensearch-project/opensearch';
import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { getStoreIdByCity } from './inventory.js';

let osClient: Client | null = null;

export function getOpenSearch(): Client | null {
  if (!env.hasOpenSearch || !env.OPENSEARCH_URL) return null;
  if (!osClient) {
    osClient = new Client({
      node: env.OPENSEARCH_URL,
      auth:
        env.OPENSEARCH_USERNAME && env.OPENSEARCH_PASSWORD
          ? { username: env.OPENSEARCH_USERNAME, password: env.OPENSEARCH_PASSWORD }
          : undefined,
      ssl: { rejectUnauthorized: false },
    });
  }
  return osClient;
}

export async function ensureProductIndex() {
  const client = getOpenSearch();
  if (!client) return false;
  const exists = await client.indices.exists({ index: env.OPENSEARCH_INDEX });
  if (exists.body) return true;
  await client.indices.create({
    index: env.OPENSEARCH_INDEX,
    body: {
      settings: {
        analysis: {
          analyzer: {
            celerity_fuzzy: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding'],
            },
          },
        },
      },
      mappings: {
        properties: {
          productId: { type: 'keyword' },
          sku: { type: 'keyword' },
          name: { type: 'text', analyzer: 'celerity_fuzzy' },
          brand: { type: 'text', analyzer: 'celerity_fuzzy' },
          category: { type: 'keyword' },
          description: { type: 'text', analyzer: 'celerity_fuzzy' },
          price: { type: 'float' },
          imageUrl: { type: 'keyword', index: false },
          specs: { type: 'object', enabled: true },
          active: { type: 'boolean' },
        },
      },
    },
  });
  return true;
}

export async function indexProduct(doc: {
  productId: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  imageUrl?: string;
  specs: unknown;
  active: boolean;
}) {
  const client = getOpenSearch();
  if (!client) return;
  await ensureProductIndex();
  await client.index({
    index: env.OPENSEARCH_INDEX,
    id: doc.productId,
    body: doc,
    refresh: true,
  });
}

export async function deleteProductIndex(productId: string) {
  const client = getOpenSearch();
  if (!client) return;
  try {
    await client.delete({ index: env.OPENSEARCH_INDEX, id: productId, refresh: true });
  } catch {
    /* ignore missing */
  }
}

async function attachInventory(productIds: string[], city?: string) {
  if (!productIds.length) return new Map<string, number>();
  const pool = getPool();
  let storeId: string | null = null;
  if (city) storeId = await getStoreIdByCity(pool, city);
  const res = storeId
    ? await pool.query(
        `SELECT product_id, stock FROM inventory
         WHERE store_id = $1 AND product_id = ANY($2::uuid[])`,
        [storeId, productIds]
      )
    : await pool.query(
        `SELECT product_id, SUM(stock) AS stock FROM inventory
         WHERE product_id = ANY($1::uuid[])
         GROUP BY product_id`,
        [productIds]
      );
  const map = new Map<string, number>();
  for (const row of res.rows) map.set(row.product_id, Number(row.stock));
  return map;
}

export async function searchProducts(input: {
  q?: string;
  city?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ mode: 'opensearch' | 'postgres'; items: unknown[]; total: number }> {
  const page = input.page ?? 1;
  const pageSize = Math.min(input.pageSize ?? 24, 100);
  const from = (page - 1) * pageSize;

  const client = getOpenSearch();
  if (client) {
    try {
      await ensureProductIndex();
      const must: object[] = [{ term: { active: true } }];
      if (input.q?.trim()) {
        must.push({
          multi_match: {
            query: input.q,
            fields: ['name^3', 'brand^2', 'sku', 'category', 'description', 'specs.*'],
            fuzziness: 'AUTO',
          },
        });
      }
      if (input.category) must.push({ term: { category: input.category } });
      if (input.brand) must.push({ match: { brand: input.brand } });
      if (input.minPrice != null || input.maxPrice != null) {
        must.push({
          range: {
            price: {
              ...(input.minPrice != null ? { gte: input.minPrice } : {}),
              ...(input.maxPrice != null ? { lte: input.maxPrice } : {}),
            },
          },
        });
      }

      let sort: object[] = [{ _score: 'desc' }];
      if (input.sort === 'price_asc') sort = [{ price: 'asc' }];
      if (input.sort === 'price_desc') sort = [{ price: 'desc' }];
      if (input.sort === 'newest') sort = [{ productId: 'desc' }];

      const result = await client.search({
        index: env.OPENSEARCH_INDEX,
        body: { from, size: pageSize, query: { bool: { must } }, sort },
      });

      const hits = (result.body.hits.hits ?? []) as Array<{ _source: Record<string, unknown> }>;
      const ids = hits.map((h) => String(h._source.productId));
      const stockMap = await attachInventory(ids, input.city);
      // Backfill imageUrl from Postgres when older OpenSearch docs omit it
      const imageMap = new Map<string, string>();
      if (ids.length) {
        const pool = getPool();
        const imgRes = await pool.query(
          `SELECT id, image_url FROM products WHERE id = ANY($1::uuid[])`,
          [ids]
        );
        for (const row of imgRes.rows) {
          imageMap.set(String(row.id), String(row.image_url || ''));
        }
      }
      let items = hits.map((h) => {
        const s = h._source;
        const id = String(s.productId);
        const stock = stockMap.get(id) ?? 0;
        const imageUrl = String(s.imageUrl || imageMap.get(id) || '');
        return { ...s, imageUrl, stock, inStock: stock > 0 };
      });
      if (input.inStockOnly) items = items.filter((i) => (i as { inStock: boolean }).inStock);
      const total =
        typeof result.body.hits.total === 'object'
          ? result.body.hits.total.value
          : Number(result.body.hits.total ?? items.length);
      if (total > 0 || items.length > 0) {
        return { mode: 'opensearch', items, total };
      }
      console.warn('[search] OpenSearch empty — falling back to Postgres');
    } catch (err) {
      console.error('[search] OpenSearch failed, falling back to Postgres:', (err as Error).message);
    }
  }

  // Postgres fallback
  if (!env.hasDatabase) {
    return { mode: 'postgres', items: [], total: 0 };
  }
  try {
    const pool = getPool();
    const params: unknown[] = [];
    const where = ['p.active = true'];
    if (input.q?.trim()) {
      params.push(`%${input.q.trim()}%`);
      where.push(
        `(p.name ILIKE $${params.length} OR p.brand ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.category ILIKE $${params.length} OR p.description ILIKE $${params.length})`
      );
    }
    if (input.category) {
      params.push(input.category);
      where.push(`p.category = $${params.length}`);
    }
    if (input.brand) {
      params.push(input.brand);
      where.push(`p.brand ILIKE $${params.length}`);
    }

    let order = 'p.created_at DESC';
    if (input.sort === 'price_asc') order = 'COALESCE(p.offer_price, p.price) ASC';
    if (input.sort === 'price_desc') order = 'COALESCE(p.offer_price, p.price) DESC';

    params.push(pageSize, from);
    const sql = `
    SELECT p.*, COALESCE(SUM(i.stock), 0) AS stock
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE ${where.join(' AND ')}
    GROUP BY p.id
    ORDER BY ${order}
    LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const res = await pool.query(sql, params);
    let items = res.rows.map((r) => ({
      productId: r.id,
      sku: r.sku,
      name: r.name,
      brand: r.brand,
      category: r.category,
      description: r.description,
      price: Number(r.offer_price ?? r.price),
      imageUrl: r.image_url,
      stock: Number(r.stock),
      inStock: Number(r.stock) > 0,
      active: r.active,
    }));
    if (input.inStockOnly) items = items.filter((i) => i.inStock);
    return { mode: 'postgres', items, total: items.length };
  } catch (err) {
    console.error('[search] Postgres fallback failed:', (err as Error).message);
    return { mode: 'postgres', items: [], total: 0 };
  }
}

export async function reindexAllFromPostgres() {
  const pool = getPool();
  const res = await pool.query(
    `SELECT id, sku, name, brand, category, description, price, offer_price, image_url, specs, active FROM products`
  );
  await ensureProductIndex();
  for (const row of res.rows) {
    await indexProduct({
      productId: row.id,
      sku: row.sku,
      name: row.name,
      brand: row.brand,
      category: row.category,
      description: row.description,
      price: Number(row.offer_price ?? row.price),
      imageUrl: row.image_url || '',
      specs: row.specs,
      active: row.active,
    });
  }
  return res.rows.length;
}
