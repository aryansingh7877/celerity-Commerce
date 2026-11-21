import type { DbClient } from '../db/pool.js';
import { enqueueOutbox } from './outbox.js';
import { HttpError } from '../middleware/errors.js';
import { notifySupplierOnStockDepletion } from './supplierNotify.js';

export async function getStoreIdByCity(client: DbClient, city: string): Promise<string> {
  const normalized = city === 'Bangalore' ? 'Bengaluru' : city;
  const res = await client.query<{ id: string }>(
    'SELECT id FROM stores WHERE city = $1 LIMIT 1',
    [normalized]
  );
  if (!res.rows[0]) throw new HttpError(400, `Unknown city: ${city}`);
  return String(res.rows[0].id);
}

export async function adjustStock(
  client: DbClient,
  input: {
    productId: string;
    storeId: string;
    newStock: number;
    changeType: string;
    adminId?: string | null;
    city?: string | null;
  }
) {
  if (input.newStock < 0) throw new HttpError(400, 'Stock cannot be negative');

  const current = await client.query<{ stock: number; reorder_threshold: number }>(
    `SELECT stock, reorder_threshold FROM inventory
     WHERE product_id = $1 AND store_id = $2 FOR UPDATE`,
    [input.productId, input.storeId]
  );

  let previous = 0;
  let reorder = 5;
  if (!current.rows[0]) {
    await client.query(
      `INSERT INTO inventory (product_id, store_id, stock, stock_quantity)
       VALUES ($1, $2, $3, $3) RETURNING id`,
      [input.productId, input.storeId, input.newStock]
    );
  } else {
    previous = current.rows[0].stock;
    reorder = current.rows[0].reorder_threshold;
    await client.query(
      `UPDATE inventory
       SET stock = $3, stock_quantity = $3, updated_at = now()
       WHERE product_id = $1 AND store_id = $2
       RETURNING id`,
      [input.productId, input.storeId, input.newStock]
    );
  }

  await client.query(
    `INSERT INTO inventory_audit_logs
      (product_id, store_id, previous_stock, new_stock, change_type, admin_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      input.productId,
      input.storeId,
      previous,
      input.newStock,
      input.changeType,
      input.adminId ?? null,
    ]
  );

  await enqueueOutbox(client, {
    eventType: 'inventory.updated',
    entityId: input.productId,
    city: input.city ?? null,
    payload: {
      product_id: input.productId,
      store_id: input.storeId,
      previous_stock: previous,
      new_stock: input.newStock,
      change_type: input.changeType,
    },
  });

  if (input.newStock === 0) {
    await enqueueOutbox(client, {
      eventType: 'inventory.out_of_stock',
      entityId: input.productId,
      city: input.city ?? null,
      payload: {
        product_id: input.productId,
        store_id: input.storeId,
        reorder_threshold: reorder,
      },
    });
    // Immediate supplier WhatsApp (does not wait on Kafka worker)
    if (previous > 0) {
      await notifySupplierOnStockDepletion({
        productId: input.productId,
        storeId: input.storeId,
        city: input.city,
        stock: 0,
        reorderThreshold: reorder,
        reason: 'out_of_stock',
      }).catch((err) => console.error('[inventory] supplier notify failed', err));
    }
  } else if (input.newStock <= reorder) {
    await enqueueOutbox(client, {
      eventType: 'inventory.low_stock',
      entityId: input.productId,
      city: input.city ?? null,
      payload: {
        product_id: input.productId,
        store_id: input.storeId,
        stock: input.newStock,
        reorder_threshold: reorder,
      },
    });
    if (previous > reorder) {
      await notifySupplierOnStockDepletion({
        productId: input.productId,
        storeId: input.storeId,
        city: input.city,
        stock: input.newStock,
        reorderThreshold: reorder,
        reason: 'low_stock',
      }).catch((err) => console.error('[inventory] supplier notify failed', err));
    }
  }

  return { previous, newStock: input.newStock };
}

/** Atomic conditional decrement. Returns new stock or null if insufficient. */
export async function decrementStockIfAvailable(
  client: DbClient,
  productId: string,
  storeId: string,
  qty: number
): Promise<number | null> {
  const res = await client.query<{ stock: number }>(
    `UPDATE inventory
     SET stock = stock - $1, last_sold_at = now(), updated_at = now()
     WHERE product_id = $2 AND store_id = $3 AND stock >= $1
     RETURNING stock`,
    [qty, productId, storeId]
  );
  return res.rows[0]?.stock ?? null;
}
