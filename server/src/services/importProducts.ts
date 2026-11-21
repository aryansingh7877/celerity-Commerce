import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { getPool } from '../db/pool.js';
import { adjustStock, getStoreIdByCity } from './inventory.js';
import { enqueueOutbox } from './outbox.js';
import { indexProduct } from './search.js';

export type ImportRow = {
  sku: string;
  name: string;
  brand?: string;
  category: string;
  price: number;
  offerPrice?: number;
  city: string;
  stock: number;
  description?: string;
  imageUrl?: string;
  reorderThreshold?: number;
  supplierName?: string;
  supplierPhone?: string;
};

function normalizeCity(city: string): string {
  const c = city.trim();
  if (/bangalore|bengaluru/i.test(c)) return 'Bengaluru';
  if (/mumbai/i.test(c)) return 'Mumbai';
  if (/delhi/i.test(c)) return 'Delhi';
  return c;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseMoney(raw: string, fallback?: number): number | undefined {
  if (!raw) return fallback;
  const n = Number(String(raw).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function parseRow(
  raw: Record<string, unknown>,
  rowNumber: number
): { ok: true; row: ImportRow } | { ok: false; error: string } {
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    const text = String(value).trim();
    if (!text) continue;
    map.set(normalizeKey(key), text);
  }

  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = map.get(normalizeKey(k));
      if (v) return v;
    }
    return '';
  };

  const sku = get('sku', 'sku_id', 'product_sku', 'id');
  const name = get('name', 'product_name', 'title', 'model_name', 'model');
  const brand = get('brand');
  const category = get('category') || (brand ? 'Laptops' : '');
  const priceRaw = get(
    'price',
    'retail_price_inr',
    'retail_price',
    'offer_price',
    'mrp_inr',
    'mrp',
    'amount'
  );
  const mrpRaw = get('mrp_inr', 'mrp');
  const price = parseMoney(priceRaw);
  const offerFromMrp = priceRaw && mrpRaw && priceRaw !== mrpRaw ? parseMoney(priceRaw) : undefined;
  const listPrice = parseMoney(mrpRaw) ?? price;
  const stockRaw = get('stock', 'quantity', 'qty');
  const stock = stockRaw ? Number(stockRaw.replace(/[^0-9]/g, '')) : 20;
  const city = normalizeCity(get('city', 'location', 'hub', 'region') || 'Bengaluru');
  const supplierName = get('supplier_name', 'supplier', 'vendor');
  const supplierPhone = get(
    'supplier_phone',
    'supplier_phone_number',
    'whatsapp',
    'whatsapp_e164',
    'phone'
  );
  const descriptionParts = [
    get('description'),
    get('series'),
    get('processor'),
    get('ram'),
    get('storage'),
    get('display'),
    get('graphics'),
    get('os'),
    get('warranty'),
  ].filter(Boolean);
  const description = descriptionParts.join(' · ');
  const imageUrl = get('image', 'image_url', 'imageurl');
  const reorderThreshold = get('reorder_threshold') ? Number(get('reorder_threshold')) : 5;

  if (!sku) return { ok: false, error: `Row ${rowNumber}: SKU required` };
  if (!name) return { ok: false, error: `Row ${rowNumber}: name required` };
  if (!category) return { ok: false, error: `Row ${rowNumber}: category required` };
  if (listPrice == null || listPrice < 0) return { ok: false, error: `Row ${rowNumber}: invalid price` };
  if (!Number.isFinite(stock) || stock < 0) return { ok: false, error: `Row ${rowNumber}: invalid stock` };
  if (!['Bengaluru', 'Mumbai', 'Delhi'].includes(city)) {
    return { ok: false, error: `Row ${rowNumber}: city must be Bengaluru/Mumbai/Delhi` };
  }

  return {
    ok: true,
    row: {
      sku,
      name,
      brand,
      category,
      price: listPrice,
      offerPrice: offerFromMrp && offerFromMrp !== listPrice ? offerFromMrp : parseMoney(get('offer_price', 'offerprice')),
      city,
      stock,
      description,
      imageUrl,
      reorderThreshold,
      supplierName: supplierName || undefined,
      supplierPhone: supplierPhone || undefined,
    },
  };
}

function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (raw.trim().startsWith('+') && digits.length >= 10) return `+${digits}`;
  return digits.length >= 10 ? `+${digits}` : null;
}

async function upsertProductSupplier(
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
  productId: string,
  supplierName: string,
  supplierPhone?: string
) {
  const phone = supplierPhone ? normalizeWhatsapp(supplierPhone) : null;
  let supplierId: string | undefined;

  if (phone) {
    const byPhone = await client.query(
      `SELECT id FROM suppliers WHERE whatsapp_e164 = $1 LIMIT 1`,
      [phone]
    );
    supplierId = byPhone.rows[0]?.id as string | undefined;
  }
  if (!supplierId) {
    const byName = await client.query(
      `SELECT id FROM suppliers WHERE lower(name) = lower($1) LIMIT 1`,
      [supplierName]
    );
    supplierId = byName.rows[0]?.id as string | undefined;
  }
  if (!supplierId) {
    const created = await client.query(
      `INSERT INTO suppliers (name, whatsapp_e164)
       VALUES ($1, $2)
       RETURNING id`,
      [supplierName, phone]
    );
    supplierId = created.rows[0]?.id as string | undefined;
  } else if (phone) {
    await client.query(
      `UPDATE suppliers SET
         name = $2,
         whatsapp_e164 = COALESCE($3, whatsapp_e164),
         updated_at = now()
       WHERE id = $1`,
      [supplierId, supplierName, phone]
    );
  }

  if (!supplierId) return;

  await client.query(
    `INSERT INTO product_suppliers (product_id, supplier_id, is_primary)
     VALUES ($1, $2, true)
     ON CONFLICT (product_id, supplier_id) DO UPDATE SET is_primary = true`,
    [productId, supplierId]
  );
  await client.query(
    `UPDATE product_suppliers SET is_primary = false
     WHERE product_id = $1 AND supplier_id <> $2`,
    [productId, supplierId]
  );
}

export function parseCsvBuffer(buf: Buffer): Array<Record<string, unknown>> {
  return parse(buf, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
}

/** SheetJS — ignores drawings/anchors that crash ExcelJS on image-heavy workbooks. */
export async function parseExcelBuffer(buf: Buffer): Promise<Array<Record<string, unknown>>> {
  const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });
  return rows;
}

export async function importProductRows(
  rows: Array<Record<string, unknown>>,
  adminId: string,
  source: 'csv' | 'excel'
) {
  const pool = getPool();
  const client = await pool.connect();
  const errors: Array<{ rowNumber: number; message: string }> = [];
  const valid: ImportRow[] = [];

  rows.forEach((raw, idx) => {
    const parsed = parseRow(raw, idx + 2);
    if (parsed.ok) valid.push(parsed.row);
    else errors.push({ rowNumber: idx + 2, message: parsed.error });
  });

  try {
    await client.query('BEGIN');
    const jobRes = await client.query(
      `INSERT INTO import_jobs (admin_id, source, valid_rows, invalid_rows, status)
       VALUES ($1, $2, $3, $4, 'completed') RETURNING id`,
      [adminId, source, valid.length, errors.length]
    );
    const jobId = jobRes.rows[0]?.id;
    if (!jobId) throw new Error('Failed to create import job');

    for (const e of errors) {
      await client.query(
        `INSERT INTO import_errors (job_id, row_number, message) VALUES ($1, $2, $3) RETURNING id`,
        [jobId, e.rowNumber, e.message]
      );
    }

    const upserted: string[] = [];
    for (const row of valid) {
      const storeId = await getStoreIdByCity(client, row.city);
      const prod = await client.query(
        `INSERT INTO products (sku, name, brand, category, description, price, offer_price, image_url, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           brand = EXCLUDED.brand,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           offer_price = EXCLUDED.offer_price,
           image_url = COALESCE(NULLIF(EXCLUDED.image_url, ''), products.image_url),
           active = true,
           updated_at = now()
         RETURNING *`,
        [
          row.sku,
          row.name,
          row.brand ?? '',
          row.category,
          row.description ?? '',
          row.price,
          row.offerPrice ?? null,
          row.imageUrl ?? '',
        ]
      );
      const product = prod.rows[0];
      if (!product?.id) {
        errors.push({ rowNumber: 0, message: `Failed to upsert SKU ${row.sku}` });
        continue;
      }
      await adjustStock(client, {
        productId: product.id,
        storeId,
        newStock: row.stock,
        changeType: 'import',
        adminId,
        city: row.city,
      });
      if (row.supplierName) {
        await upsertProductSupplier(client, product.id, row.supplierName, row.supplierPhone);
      }
      if (row.reorderThreshold != null) {
        await client.query(
          `UPDATE inventory SET reorder_threshold = $3, updated_at = now()
           WHERE product_id = $1 AND store_id = $2 RETURNING id`,
          [product.id, storeId, row.reorderThreshold]
        );
      }
      await enqueueOutbox(client, {
        eventType: 'product.updated',
        entityId: product.id,
        city: row.city,
        payload: { product_id: product.id, sku: product.sku },
      });
      upserted.push(String(product.id));
    }

    await client.query('COMMIT');

    for (const id of upserted) {
      const p = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      const row = p.rows[0];
      if (row) {
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
          active: row.active !== false,
        }).catch(() => undefined);
      }
    }

    return {
      jobId,
      validRows: valid.length,
      invalidRows: errors.length,
      errors,
      productIds: upserted,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
