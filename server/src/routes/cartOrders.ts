import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import { createOrder, validateCart } from '../services/checkout.js';
import { findAlternatives } from '../services/rescue.js';
import { getPool } from '../db/pool.js';
import { getStoreIdByCity } from '../services/inventory.js';
import { notifySupplierOnStockDepletion } from '../services/supplierNotify.js';

const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const cartRouter = Router();
export const ordersRouter = Router();
export const rescueRouter = Router();

cartRouter.post(
  '/validate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        city: z.enum(['Bengaluru', 'Mumbai', 'Delhi', 'Bangalore']),
        lines: z.array(lineSchema).min(1),
      })
      .parse(req.body);
    const city = body.city === 'Bangalore' ? 'Bengaluru' : body.city;
    const result = await validateCart(city, body.lines);
    res.status(result.allOk ? 200 : 409).json(result);
  })
);

ordersRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        city: z.enum(['Bengaluru', 'Mumbai', 'Delhi', 'Bangalore']),
        lines: z.array(lineSchema).min(1),
        shipping: z.number().optional(),
      })
      .parse(req.body);
    const city = body.city === 'Bangalore' ? 'Bengaluru' : body.city;
    try {
      const result = await createOrder({
        userId: req.user!.id,
        city,
        lines: body.lines,
        shipping: body.shipping,
      });

      // After checkout, notify suppliers for any line that is now OOS / low
      try {
        const pool = getPool();
        const storeId = await getStoreIdByCity(pool, city);
        for (const line of body.lines) {
          const inv = await pool.query<{ stock: number; reorder_threshold: number }>(
            `SELECT stock, reorder_threshold FROM inventory
             WHERE product_id = $1 AND store_id = $2`,
            [line.productId, storeId]
          );
          const row = inv.rows[0];
          if (!row) continue;
          if (row.stock === 0 || row.stock <= row.reorder_threshold) {
            await notifySupplierOnStockDepletion({
              productId: line.productId,
              storeId,
              city,
              stock: row.stock,
              reorderThreshold: row.reorder_threshold,
              reason: row.stock === 0 ? 'out_of_stock' : 'low_stock',
            }).catch(() => undefined);
          }
        }
      } catch (notifyErr) {
        console.error('[checkout] supplier notify skipped', notifyErr);
      }

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        res.status(409).json({ error: 'STOCK_CONFLICT', details: err.details });
        return;
      }
      throw err;
    }
  })
);

ordersRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const orders = await pool.query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    res.json({ orders: orders.rows });
  })
);

ordersRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const order = await pool.query(`SELECT * FROM orders WHERE id = $1 AND user_id = $2`, [
      req.params.id,
      req.user!.id,
    ]);
    if (!order.rows[0]) throw new HttpError(404, 'Order not found');
    const items = await pool.query(`SELECT * FROM order_items WHERE order_id = $1`, [
      req.params.id,
    ]);
    res.json({ order: order.rows[0], items: items.rows });
  })
);

rescueRouter.post(
  '/suggestions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        productId: z.string().uuid(),
        city: z.enum(['Bengaluru', 'Mumbai', 'Delhi', 'Bangalore']),
      })
      .parse(req.body);
    const city = body.city === 'Bangalore' ? 'Bengaluru' : body.city;
    const result = await findAlternatives({ productId: body.productId, city });
    res.json(result);
  })
);

rescueRouter.post(
  '/swap',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        unavailableProductId: z.string().uuid(),
        replacementProductId: z.string().uuid(),
        city: z.enum(['Bengaluru', 'Mumbai', 'Delhi', 'Bangalore']),
        quantity: z.number().int().positive().default(1),
      })
      .parse(req.body);
    const city = body.city === 'Bangalore' ? 'Bengaluru' : body.city;
    const validated = await validateCart(city, [
      { productId: body.replacementProductId, quantity: body.quantity },
    ]);
    if (!validated.allOk) {
      throw new HttpError(409, 'Replacement unavailable', validated.lines[0]);
    }
    res.json({
      removed: body.unavailableProductId,
      added: validated.lines[0],
    });
  })
);
