import { Router } from 'express';
import { z } from 'zod';
import { getPool } from '../db/pool.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { getStoreIdByCity } from '../services/inventory.js';
import { searchProducts } from '../services/search.js';

export const productsRouter = Router();

productsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = z
      .object({
        city: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        q: z.string().optional(),
        inStockOnly: z.string().optional(),
        sort: z.string().optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
        minPrice: z.coerce.number().optional(),
        maxPrice: z.coerce.number().optional(),
      })
      .parse(req.query);

    const result = await searchProducts({
      q: q.q,
      city: q.city,
      category: q.category,
      brand: q.brand,
      inStockOnly: q.inStockOnly === 'true',
      sort: q.sort,
      page: q.page,
      pageSize: q.pageSize,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
    });
    res.setHeader('X-Search-Mode', result.mode);
    if (result.mode === 'postgres') {
      console.warn('[search] degraded mode: PostgreSQL fallback');
    }
    res.json(result);
  })
);

productsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const pool = getPool();
    const prod = await pool.query('SELECT * FROM products WHERE id = $1 AND active = true', [
      req.params.id,
    ]);
    if (!prod.rows[0]) throw new HttpError(404, 'Product not found');
    let stock = 0;
    if (city) {
      const storeId = await getStoreIdByCity(pool, city);
      const inv = await pool.query(
        'SELECT stock FROM inventory WHERE product_id = $1 AND store_id = $2',
        [req.params.id, storeId]
      );
      stock = Number(inv.rows[0]?.stock ?? 0);
    } else {
      const inv = await pool.query(
        'SELECT COALESCE(SUM(stock),0) AS stock FROM inventory WHERE product_id = $1',
        [req.params.id]
      );
      stock = Number(inv.rows[0]?.stock ?? 0);
    }
    const p = prod.rows[0];
    res.json({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      specs: p.specs,
      price: Number(p.price),
      offerPrice: p.offer_price != null ? Number(p.offer_price) : null,
      imageUrl: p.image_url,
      warranty: p.warranty,
      stock,
      inStock: stock > 0,
      city: city ?? null,
    });
  })
);

export const searchRouter = Router();
searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    // alias of products list search
    req.url = '/';
    // reuse handler via redirect-style call
    const q = z
      .object({
        q: z.string().optional(),
        city: z.string().optional(),
        category: z.string().optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    const result = await searchProducts(q);
    res.setHeader('X-Search-Mode', result.mode);
    res.json(result);
  })
);
