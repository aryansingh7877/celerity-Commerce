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

  const any = await pool.query<SupplierRow>(
    `SELECT id, name, whatsapp_e164 FROM suppliers
     WHERE whatsapp_e164 IS NOT NULL AND btrim(whatsapp_e164) <> ''
     ORDER BY created_at DESC LIMIT 1`
  );
  return any.rows[0] ?? null;
}

/**
 * Acquire a DB lock shared by API + Kafka paths.
 * Returns false if a successful notify already happened within the cooldown window.
 * Manual retries bypass this via forceSend.
 */
async function tryAcquireNotifyLock(input: {
  productId: string;
  storeId: string;
  reason: string;
  forceSend?: boolean;
}): Promise<{ allowed: boolean; lastNotifiedAt?: string }> {
  const pool = getPool();
  const hours = env.AI_NOTIFY_DEDUPE_HOURS;

  if (input.forceSend) {
    return { allowed: true };
  }

  // Race-safe claim: skip any second automatic send inside the cooldown
  // (success or failure). Manual retry uses forceSend to bypass.
  // Table: migration 20261121220000_p0_notify_dedupe
  const claimed = await pool.query<{ last_notified_at: string }>(
    `INSERT INTO supplier_notify_locks (product_id, store_id, reason, last_notified_at, last_status)
     VALUES ($1, $2, $3, now(), 'claiming')
     ON CONFLICT (product_id, store_id, reason) DO UPDATE SET
       last_notified_at = now(),
       last_status = 'claiming'
     WHERE supplier_notify_locks.last_notified_at < now() - ($4::text || ' hours')::interval
     RETURNING last_notified_at`,
    [input.productId, input.storeId, input.reason, String(hours)]
  );

  if (!claimed.rows[0]) {
    const existing = await pool.query<{ last_notified_at: string }>(
      `SELECT last_notified_at FROM supplier_notify_locks
       WHERE product_id = $1 AND store_id = $2 AND reason = $3`,
      [input.productId, input.storeId, input.reason]
    );
    return {
      allowed: false,
      lastNotifiedAt: existing.rows[0]?.last_notified_at,
    };
  }
  return { allowed: true };
}

async function updateNotifyLock(input: {
  productId: string;
  storeId: string;
  reason: string;
  restockId: string;
  status: string;
}) {
  const pool = getPool();
  await pool.query(
    `UPDATE supplier_notify_locks SET
       last_notified_at = now(),
       restock_request_id = $4,
       last_status = $5
     WHERE product_id = $1 AND store_id = $2 AND reason = $3`,
    [input.productId, input.storeId, input.reason, input.restockId, input.status]
  );
}

/**
 * When stock hits 0 (or drops to/below reorder), open a restock request and
 * WhatsApp the linked / default supplier contact (template-only).
 */
export async function notifySupplierOnStockDepletion(input: {
  productId: string;
  storeId: string;
  city?: string | null;
  stock: number;
  reorderThreshold: number;
  reason: 'out_of_stock' | 'low_stock';
  /** Bypass DB cooldown — used only by safe admin retry of failed notifies */
  forceSend?: boolean;
}) {
  const pool = getPool();

  const lock = await tryAcquireNotifyLock({
    productId: input.productId,
    storeId: input.storeId,
    reason: input.reason,
    forceSend: input.forceSend,
  });
  if (!lock.allowed) {
    console.log(
      `[supplier-notify] skipped (dedupe) product=${input.productId} reason=${input.reason} last=${lock.lastNotifiedAt}`
    );
    return {
      notified: false as const,
      reason: 'deduped' as const,
      lastNotifiedAt: lock.lastNotifiedAt,
    };
  }

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
  if (!info) return { notified: false as const, reason: 'product_or_store_missing' as const };

  const suggested = Math.max(
    input.reorderThreshold * 2 - input.stock,
    input.reorderThreshold || 5
  );

  const supplier = await resolveSupplier(input.productId);

  if (supplier) {
    await pool.query(
      `INSERT INTO product_suppliers (product_id, supplier_id, is_primary)
       VALUES ($1, $2, true)
       ON CONFLICT (product_id, supplier_id) DO NOTHING`,
      [input.productId, supplier.id]
    );
  }

  const existing = await pool.query<{ id: string; whatsapp_status: string }>(
    `SELECT id, whatsapp_status FROM restock_requests
     WHERE product_id = $1 AND store_id = $2 AND status = 'open'
     LIMIT 1`,
    [input.productId, input.storeId]
  );

  // Secondary guard: open restock already submitted within cooldown (pre-lock-table races)
  if (
    !input.forceSend &&
    existing.rows[0]?.whatsapp_status === 'submitted'
  ) {
    const recent = await pool.query<{ created_at: string }>(
      `SELECT created_at FROM supplier_notification_logs
       WHERE restock_request_id = $1 AND status = 'submitted'
       ORDER BY created_at DESC LIMIT 1`,
      [existing.rows[0].id]
    );
    if (recent.rows[0]) {
      const ageMs = Date.now() - new Date(recent.rows[0].created_at).getTime();
      if (ageMs < env.AI_NOTIFY_DEDUPE_HOURS * 3600_000) {
        await updateNotifyLock({
          productId: input.productId,
          storeId: input.storeId,
          reason: input.reason,
          restockId: existing.rows[0].id,
          status: 'submitted',
        });
        return {
          notified: false as const,
          reason: 'deduped' as const,
          restockId: existing.rows[0].id,
          lastNotifiedAt: recent.rows[0].created_at,
        };
      }
    }
  }

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
    await updateNotifyLock({
      productId: input.productId,
      storeId: input.storeId,
      reason: input.reason,
      restockId,
      status: 'pending_configuration',
    });
    return { notified: false as const, reason: 'no_supplier_whatsapp' as const, restockId };
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
    await updateNotifyLock({
      productId: input.productId,
      storeId: input.storeId,
      reason: input.reason,
      restockId,
      status: 'submitted',
    });
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
  await updateNotifyLock({
    productId: input.productId,
    storeId: input.storeId,
    reason: input.reason,
    restockId,
    status: result.status,
  });
  console.warn(`[supplier-notify] WhatsApp failed for ${info.sku}: ${result.reason}`);
  return { notified: false as const, reason: result.reason, restockId, status: result.status };
}
