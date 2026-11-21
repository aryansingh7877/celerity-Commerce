import { getPool } from '../db/pool.js';
import { sendRestockWhatsApp, logNotification } from './whatsapp.js';
import { env } from '../config/env.js';

type SupplierRow = {
  id: string;
  name: string;
  whatsapp_e164: string | null;
};

async function resolveSupplier(productId: string): Promise<SupplierRow | null> {
  const pool = getPool();
  const linked = await pool.query<SupplierRow>(
    `SELECT s.id, s.name, s.whatsapp_e164
     FROM product_suppliers ps
     JOIN suppliers s ON s.id = ps.supplier_id
     WHERE ps.product_id = $1 AND s.whatsapp_e164 IS NOT NULL AND btrim(s.whatsapp_e164) <> ''
     ORDER BY ps.is_primary DESC, s.created_at
     LIMIT 1`,
    [productId]
  );
  if (linked.rows[0]) return linked.rows[0];

  // Fallback: any supplier contact the merchant added
  const any = await pool.query<SupplierRow>(
    `SELECT id, name, whatsapp_e164 FROM suppliers
     WHERE whatsapp_e164 IS NOT NULL AND btrim(whatsapp_e164) <> ''
     ORDER BY created_at DESC LIMIT 1`
  );
  return any.rows[0] ?? null;
}

/**
 * When stock hits 0 (or drops to/below reorder), open a restock request and
 * WhatsApp the linked / default supplier contact.
 */
export async function notifySupplierOnStockDepletion(input: {
  productId: string;
  storeId: string;
  city?: string | null;
  stock: number;
  reorderThreshold: number;
  reason: 'out_of_stock' | 'low_stock';
}) {
  const pool = getPool();

  const meta = await pool.query<{
    product_name: string;
    sku: string;
    city: string;
  }>(
    `SELECT p.name AS product_name, p.sku, s.city
     FROM products p
     JOIN stores s ON s.id = $2
     WHERE p.id = $1`,
    [input.productId, input.storeId]
  );
  const info = meta.rows[0];
  if (!info) return { notified: false, reason: 'product_or_store_missing' as const };

  const suggested = Math.max(
    input.reorderThreshold * 2 - input.stock,
    input.reorderThreshold || 5
  );

  const supplier = await resolveSupplier(input.productId);

  // Ensure product↔supplier link for future alerts
  if (supplier) {
    await pool.query(
      `INSERT INTO product_suppliers (product_id, supplier_id, is_primary)
       VALUES ($1, $2, true)
       ON CONFLICT (product_id, supplier_id) DO NOTHING`,
      [input.productId, supplier.id]
    );
  }

  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM restock_requests
     WHERE product_id = $1 AND store_id = $2 AND status = 'open'
     LIMIT 1`,
    [input.productId, input.storeId]
  );

  let restockId: string;
  if (existing.rows[0]) {
    restockId = String(existing.rows[0].id);
    await pool.query(
      `UPDATE restock_requests SET
         current_stock = $2,
         reorder_threshold = $3,
         suggested_qty = $4,
         supplier_id = COALESCE($5, supplier_id),
         whatsapp_status = COALESCE(whatsapp_status, 'pending'),
         updated_at = now()
       WHERE id = $1`,
      [restockId, input.stock, input.reorderThreshold, suggested, supplier?.id ?? null]
    );
  } else {
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO restock_requests
        (product_id, store_id, supplier_id, current_stock, reorder_threshold, suggested_qty, requested_qty, status, whatsapp_status)
       VALUES ($1,$2,$3,$4,$5,$6,$6,'open',$7)
       RETURNING id`,
      [
        input.productId,
        input.storeId,
        supplier?.id ?? null,
        input.stock,
        input.reorderThreshold,
        suggested,
        env.hasWhatsApp ? 'pending' : 'pending_configuration',
      ]
    );
    restockId = String(inserted.rows[0].id);
  }

  if (!supplier?.whatsapp_e164) {
    await logNotification({
      restockRequestId: restockId,
      supplierId: supplier?.id,
      status: 'pending_configuration',
      failureReason: 'Add a supplier with WhatsApp number (Admin → Suppliers)',
    });
    await pool.query(
      `UPDATE restock_requests SET whatsapp_status = 'pending_configuration', updated_at = now() WHERE id = $1`,
      [restockId]
    );
    return { notified: false, reason: 'no_supplier_whatsapp' as const, restockId };
  }

  const result = await sendRestockWhatsApp({
    toE164: supplier.whatsapp_e164,
    supplierName: supplier.name,
    productName: info.product_name,
    sku: info.sku,
    city: input.city || info.city,
    stock: input.stock,
    reorderThreshold: input.reorderThreshold,
    suggestedQty: suggested,
  });

  if (result.ok) {
    await logNotification({
      restockRequestId: restockId,
      supplierId: supplier.id,
      status: 'submitted',
      providerMessageId: result.messageId,
      providerResponse: result.response,
    });
    await pool.query(
      `UPDATE restock_requests SET whatsapp_status = 'submitted', updated_at = now() WHERE id = $1`,
      [restockId]
    );
    console.log(
      `[supplier-notify] WhatsApp sent to ${supplier.whatsapp_e164} for ${info.sku} (${input.reason})`
    );
    return { notified: true as const, restockId, messageId: result.messageId };
  }

  await logNotification({
    restockRequestId: restockId,
    supplierId: supplier.id,
    status: result.status,
    failureReason: result.reason,
    providerResponse: result.response,
  });
  await pool.query(
    `UPDATE restock_requests SET whatsapp_status = $2, updated_at = now() WHERE id = $1`,
    [restockId, result.status]
  );
  console.warn(`[supplier-notify] WhatsApp failed for ${info.sku}: ${result.reason}`);
  return { notified: false, reason: result.reason, restockId };
}
