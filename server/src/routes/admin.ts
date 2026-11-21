import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { getPool } from '../db/pool.js';
import { adjustStock, getStoreIdByCity } from '../services/inventory.js';
import { enqueueOutbox } from '../services/outbox.js';
import { importProductRows, parseCsvBuffer, parseExcelBuffer } from '../services/importProducts.js';
import { indexProduct, deleteProductIndex, reindexAllFromPostgres } from '../services/search.js';
import { env } from '../config/env.js';
import { sendRestockWhatsApp, logNotification } from '../services/whatsapp.js';
import { ollamaGenerate } from '../services/ollama.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const adminRouter = Router();
// Any signed-in user can use merchant admin (same dual-mode UX as before)
adminRouter.use(requireAuth);

adminRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const pool = getPool();
    const [products, units, orders, sales, low, oos, dead, restock] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM products WHERE active`),
      pool.query(`SELECT COALESCE(SUM(stock),0)::int AS c FROM inventory`),
      pool.query(`SELECT COUNT(*)::int AS c FROM orders`),
      pool.query(`SELECT COALESCE(SUM(total),0)::float AS c FROM orders WHERE status <> 'cancelled'`),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM inventory WHERE stock > 0 AND stock <= reorder_threshold`
      ),
      pool.query(`SELECT COUNT(*)::int AS c FROM inventory WHERE stock = 0`),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM inventory
         WHERE stock > 0 AND (last_sold_at IS NULL OR last_sold_at < now() - ($1::text || ' days')::interval)`,
        [String(env.DEAD_STOCK_DAYS)]
      ),
      pool.query(`SELECT COUNT(*)::int AS c FROM restock_requests WHERE status = 'open'`),
    ]);
    const byCity = await pool.query(
      `SELECT s.city, COALESCE(SUM(i.stock),0)::int AS units, COUNT(DISTINCT i.product_id)::int AS skus
       FROM stores s LEFT JOIN inventory i ON i.store_id = s.id
       GROUP BY s.city ORDER BY s.city`
    );
    res.json({
      totalProducts: products.rows[0].c,
      totalUnits: units.rows[0].c,
      totalOrders: orders.rows[0].c,
      salesValue: sales.rows[0].c,
      lowStock: low.rows[0].c,
      outOfStock: oos.rows[0].c,
      deadStock: dead.rows[0].c,
      pendingRestocks: restock.rows[0].c,
      byCity: byCity.rows,
    });
  })
);

adminRouter.get(
  '/inventory',
  asyncHandler(async (req, res) => {
    const city = typeof req.query.city === 'string' ? req.query.city : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const pool = getPool();
    const params: unknown[] = [];
    const where = ['1=1'];
    if (city) {
      params.push(city === 'Bangalore' ? 'Bengaluru' : city);
      where.push(`s.city = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }
    if (status === 'out_of_stock') where.push('i.stock = 0');
    if (status === 'low_stock') where.push('i.stock > 0 AND i.stock <= i.reorder_threshold');
    if (status === 'in_stock') where.push('i.stock > i.reorder_threshold');

    const result = await pool.query(
      `SELECT i.*, p.name, p.sku, p.brand, p.category, p.price, p.image_url, s.city,
        CASE
          WHEN i.stock = 0 THEN 'out_of_stock'
          WHEN i.stock <= i.reorder_threshold THEN 'low_stock'
          ELSE 'in_stock'
        END AS stock_status
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN stores s ON s.id = i.store_id
       WHERE ${where.join(' AND ')}
       ORDER BY i.updated_at DESC
       LIMIT 500`,
      params
    );
    res.json({ items: result.rows });
  })
);

adminRouter.post(
  '/inventory',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        city: z.enum(['Bengaluru', 'Mumbai', 'Delhi', 'Bangalore']),
        stock: z.number().int().min(0),
        reorderThreshold: z.number().int().min(0).optional(),
      })
      .parse(req.body);
    const city = body.city === 'Bangalore' ? 'Bengaluru' : body.city;
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const storeId = await getStoreIdByCity(client, city);
      await adjustStock(client, {
        productId: body.productId,
        storeId,
        newStock: body.stock,
        changeType: 'adjust',
        adminId: req.user!.id,
        city,
      });
      if (body.reorderThreshold != null) {
        await client.query(
          `UPDATE inventory SET reorder_threshold = $3 WHERE product_id = $1 AND store_id = $2`,
          [body.productId, storeId, body.reorderThreshold]
        );
      }
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

adminRouter.get(
  '/inventory/history',
  asyncHandler(async (req, res) => {
    const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
    const pool = getPool();
    const result = productId
      ? await pool.query(
          `SELECT * FROM inventory_audit_logs WHERE product_id = $1 ORDER BY created_at DESC LIMIT 200`,
          [productId]
        )
      : await pool.query(`SELECT * FROM inventory_audit_logs ORDER BY created_at DESC LIMIT 200`);
    res.json({ items: result.rows });
  })
);

adminRouter.get(
  '/products',
  asyncHandler(async (_req, res) => {
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.*,
         COALESCE(json_agg(json_build_object('city', s.city, 'stock', i.stock, 'storeId', s.id))
           FILTER (WHERE i.id IS NOT NULL), '[]') AS inventory
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id
       LEFT JOIN stores s ON s.id = i.store_id
       GROUP BY p.id
       ORDER BY p.updated_at DESC`
    );
    res.json({ products: result.rows });
  })
);

adminRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        sku: z.string().min(1),
        name: z.string().min(1),
        brand: z.string().default(''),
        category: z.string().min(1),
        description: z.string().default(''),
        price: z.number().min(0),
        offerPrice: z.number().min(0).optional(),
        imageUrl: z.string().default(''),
        warranty: z.string().optional(),
        city: z.enum(['Bengaluru', 'Mumbai', 'Delhi', 'Bangalore']).default('Bengaluru'),
        stock: z.number().int().min(0).default(0),
      })
      .parse(req.body);
    const city = body.city === 'Bangalore' ? 'Bengaluru' : body.city;
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const prod = await client.query(
        `INSERT INTO products (sku, name, brand, category, description, price, offer_price, image_url, warranty)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           brand = EXCLUDED.brand,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           offer_price = EXCLUDED.offer_price,
           image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), products.image_url),
           warranty = COALESCE(EXCLUDED.warranty, products.warranty),
           updated_at = now()
         RETURNING *`,
        [
          body.sku,
          body.name,
          body.brand,
          body.category,
          body.description,
          body.price,
          body.offerPrice ?? null,
          body.imageUrl,
          body.warranty ?? null,
        ]
      );
      const product = prod.rows[0];
      const storeId = await getStoreIdByCity(client, city);
      await adjustStock(client, {
        productId: product.id,
        storeId,
        newStock: body.stock,
        changeType: 'create',
        adminId: req.user!.id,
        city,
      });
      await enqueueOutbox(client, {
        eventType: 'product.created',
        entityId: product.id,
        city,
        payload: { product_id: product.id, sku: product.sku },
      });
      await client.query('COMMIT');
      await indexProduct({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description,
        price: Number(product.offer_price ?? product.price),
        imageUrl: product.image_url || '',
        specs: product.specs,
        active: product.active,
      }).catch(() => undefined);
      res.status(201).json({ product });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

adminRouter.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const productId = String(req.params.id);
    const body = z
      .object({
        name: z.string().optional(),
        brand: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        offerPrice: z.number().nullable().optional(),
        imageUrl: z.string().optional(),
        warranty: z.string().nullable().optional(),
        active: z.boolean().optional(),
      })
      .parse(req.body);
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE products SET
           name = COALESCE($2, name),
           brand = COALESCE($3, brand),
           category = COALESCE($4, category),
           description = COALESCE($5, description),
           price = COALESCE($6, price),
           offer_price = COALESCE($7, offer_price),
           image_url = COALESCE($8, image_url),
           warranty = COALESCE($9, warranty),
           active = COALESCE($10, active),
           updated_at = now()
         WHERE id = $1 RETURNING *`,
        [
          productId,
          body.name ?? null,
          body.brand ?? null,
          body.category ?? null,
          body.description ?? null,
          body.price ?? null,
          body.offerPrice === undefined ? null : body.offerPrice,
          body.imageUrl ?? null,
          body.warranty === undefined ? null : body.warranty,
          body.active ?? null,
        ]
      );
      if (!result.rows[0]) throw new HttpError(404, 'Product not found');
      await enqueueOutbox(client, {
        eventType: 'product.updated',
        entityId: productId,
        payload: { product_id: productId },
      });
      await client.query('COMMIT');
      const p = result.rows[0];
      await indexProduct({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
        price: Number(p.offer_price ?? p.price),
        imageUrl: p.image_url || '',
        specs: p.specs,
        active: p.active,
      }).catch(() => undefined);
      res.json({ product: p });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

adminRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const productId = String(req.params.id);
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE products SET active = false, updated_at = now() WHERE id = $1 RETURNING id`,
        [productId]
      );
      if (!result.rows[0]) throw new HttpError(404, 'Product not found');
      await enqueueOutbox(client, {
        eventType: 'product.deleted',
        entityId: productId,
        payload: { product_id: productId },
      });
      await client.query('COMMIT');
      await deleteProductIndex(productId).catch(() => undefined);
      res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })
);

adminRouter.get(
  '/dead-stock',
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days ?? env.DEAD_STOCK_DAYS);
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, p.brand, p.category, p.price, s.city, i.stock, i.last_sold_at,
         GREATEST(
           0,
           EXTRACT(DAY FROM now() - COALESCE(i.last_sold_at, p.created_at, i.updated_at, now()))::int
         ) AS days_since_sale,
         CASE WHEN i.last_sold_at IS NULL THEN true ELSE false END AS never_sold,
         COALESCE((
           SELECT SUM(oi.quantity) FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           WHERE oi.product_id = p.id AND o.created_at > now() - ($1::text || ' days')::interval
         ), 0)::int AS units_sold_30d,
         (i.stock * COALESCE(p.offer_price, p.price))::float AS inventory_value,
         CASE
           WHEN i.last_sold_at IS NULL THEN 'Never sold — sitting in ' || s.city || ' with stock > 0'
           ELSE 'No sale for >= ' || $1 || ' days while stock > 0'
         END AS reason
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN stores s ON s.id = i.store_id
       WHERE i.stock > 0
         AND COALESCE(p.active, true) = true
         AND (
           i.last_sold_at IS NULL
           OR i.last_sold_at < now() - ($1::text || ' days')::interval
         )
       ORDER BY never_sold DESC, days_since_sale DESC, inventory_value DESC`,
      [String(days)]
    );
    res.json({ days, items: result.rows });
  })
);

adminRouter.post(
  '/dead-stock/explain',
  asyncHandler(async (req, res) => {
    const body = z.object({ summary: z.string().min(1) }).parse(req.body);
    const prompt = `You are an inventory analyst for an electronics retailer.
Explain this dead-stock report in plain language and suggest concrete actions
(discount, move hub, WhatsApp supplier, bundle). Do not invent numbers.

${body.summary}`;
    const result = await ollamaGenerate(prompt);
    if (!result.ok) {
      res.json({ explanation: null, error: result.error });
      return;
    }
    res.json({ explanation: result.text, model: result.model });
  })
);

adminRouter.get(
  '/orders',
  asyncHandler(async (_req, res) => {
    const pool = getPool();
    const orders = await pool.query(
      `SELECT o.*, pr.email, pr.full_name FROM orders o
       JOIN profiles pr ON pr.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 200`
    );
    res.json({ orders: orders.rows });
  })
);

adminRouter.patch(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const orderId = String(req.params.id);
    const body = z
      .object({
        status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
      })
      .parse(req.body);
    const pool = getPool();
    const result = await pool.query(
      `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [orderId, body.status]
    );
    if (!result.rows[0]) throw new HttpError(404, 'Order not found');
    if (body.status === 'cancelled') {
      await enqueueOutbox(pool, {
        eventType: 'order.cancelled',
        entityId: orderId,
        payload: { order_id: orderId },
      });
    }
    res.json({ order: result.rows[0] });
  })
);

adminRouter.get(
  '/suppliers',
  asyncHandler(async (_req, res) => {
    const pool = getPool();
    const result = await pool.query(`SELECT * FROM suppliers ORDER BY name`);
    res.json({ suppliers: result.rows });
  })
);

adminRouter.post(
  '/suppliers',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        whatsappE164: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
        leadTimeDays: z.number().int().min(0).default(7),
        notes: z.string().optional(),
      })
      .parse(req.body);
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO suppliers (name, email, whatsapp_e164, lead_time_days, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [body.name, body.email ?? null, body.whatsappE164 ?? null, body.leadTimeDays, body.notes ?? null]
    );
    res.status(201).json({ supplier: result.rows[0] });
  })
);

adminRouter.put(
  '/suppliers/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        name: z.string().optional(),
        email: z.string().email().nullable().optional(),
        whatsappE164: z.string().nullable().optional(),
        leadTimeDays: z.number().int().optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(req.body);
    const pool = getPool();
    const result = await pool.query(
      `UPDATE suppliers SET
         name = COALESCE($2, name),
         email = COALESCE($3, email),
         whatsapp_e164 = COALESCE($4, whatsapp_e164),
         lead_time_days = COALESCE($5, lead_time_days),
         notes = COALESCE($6, notes),
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        body.name ?? null,
        body.email === undefined ? null : body.email,
        body.whatsappE164 === undefined ? null : body.whatsappE164,
        body.leadTimeDays ?? null,
        body.notes === undefined ? null : body.notes,
      ]
    );
    if (!result.rows[0]) throw new HttpError(404, 'Supplier not found');
    res.json({ supplier: result.rows[0] });
  })
);

adminRouter.get(
  '/restock-requests',
  asyncHandler(async (_req, res) => {
    const pool = getPool();
    const result = await pool.query(
      `SELECT r.*, p.name AS product_name, p.sku, s.city, sup.name AS supplier_name
       FROM restock_requests r
       JOIN products p ON p.id = r.product_id
       JOIN stores s ON s.id = r.store_id
       LEFT JOIN suppliers sup ON sup.id = r.supplier_id
       ORDER BY r.created_at DESC`
    );
    res.json({ requests: result.rows });
  })
);

adminRouter.patch(
  '/restock-requests/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        status: z.enum(['open', 'ordered', 'received', 'cancelled']),
      })
      .parse(req.body);
    const pool = getPool();
    const result = await pool.query(
      `UPDATE restock_requests SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id, body.status]
    );
    if (!result.rows[0]) throw new HttpError(404, 'Restock request not found');
    res.json({ request: result.rows[0] });
  })
);

adminRouter.get(
  '/notifications',
  asyncHandler(async (_req, res) => {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM supplier_notification_logs ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ notifications: result.rows });
  })
);

adminRouter.post(
  '/notifications/:id/retry',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const log = await pool.query(`SELECT * FROM supplier_notification_logs WHERE id = $1`, [
      req.params.id,
    ]);
    if (!log.rows[0]) throw new HttpError(404, 'Notification not found');
    const restockId = log.rows[0].restock_request_id;
    if (!restockId) throw new HttpError(400, 'No restock request linked');
    const rr = await pool.query(
      `SELECT r.*, p.name AS product_name, p.sku, s.city, sup.name AS supplier_name, sup.whatsapp_e164, sup.id AS supplier_id
       FROM restock_requests r
       JOIN products p ON p.id = r.product_id
       JOIN stores s ON s.id = r.store_id
       LEFT JOIN suppliers sup ON sup.id = r.supplier_id
       WHERE r.id = $1`,
      [restockId]
    );
    const row = rr.rows[0];
    if (!row?.whatsapp_e164) {
      await logNotification({
        restockRequestId: restockId,
        supplierId: row?.supplier_id,
        status: 'pending_configuration',
        failureReason: 'Supplier WhatsApp number missing',
      });
      res.json({ status: 'pending_configuration' });
      return;
    }
    const result = await sendRestockWhatsApp({
      toE164: row.whatsapp_e164,
      supplierName: row.supplier_name ?? 'Supplier',
      productName: row.product_name,
      sku: row.sku,
      city: row.city,
      stock: row.current_stock,
      reorderThreshold: row.reorder_threshold,
      suggestedQty: row.suggested_qty,
    });
    if (result.ok) {
      await logNotification({
        restockRequestId: restockId,
        supplierId: row.supplier_id,
        status: 'submitted',
        providerMessageId: result.messageId,
        providerResponse: result.response,
      });
      await pool.query(
        `UPDATE restock_requests SET whatsapp_status = 'submitted', updated_at = now() WHERE id = $1`,
        [restockId]
      );
      res.json({ status: 'submitted', messageId: result.messageId });
    } else {
      await logNotification({
        restockRequestId: restockId,
        supplierId: row.supplier_id,
        status: result.status,
        failureReason: result.reason,
        providerResponse: result.response,
      });
      await pool.query(
        `UPDATE restock_requests SET whatsapp_status = $2, updated_at = now() WHERE id = $1`,
        [restockId, result.status]
      );
      res.json({ status: result.status, reason: result.reason });
    }
  })
);

adminRouter.post(
  '/import/csv',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'file required');
    const rows = parseCsvBuffer(req.file.buffer);
    const result = await importProductRows(rows, req.user!.id, 'csv');
    res.json(result);
  })
);

adminRouter.post(
  '/import/excel',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'file required');
    const rows = await parseExcelBuffer(req.file.buffer);
    const result = await importProductRows(rows, req.user!.id, 'excel');
    res.json(result);
  })
);

adminRouter.post(
  '/reindex',
  asyncHandler(async (_req, res) => {
    const count = await reindexAllFromPostgres();
    res.json({ indexed: count });
  })
);
