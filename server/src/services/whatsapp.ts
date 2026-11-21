import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';

export type WhatsAppSendResult =
  | { ok: true; messageId: string; response: unknown }
  | { ok: false; status: 'pending_configuration' | 'failed'; reason: string; response?: unknown };

export async function sendRestockWhatsApp(input: {
  toE164: string;
  supplierName: string;
  productName: string;
  sku: string;
  city: string;
  stock: number;
  reorderThreshold: number;
  suggestedQty: number;
}): Promise<WhatsAppSendResult> {
  if (!env.hasWhatsApp) {
    return {
      ok: false,
      status: 'pending_configuration',
      reason: 'WhatsApp credentials missing (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME)',
    };
  }

  const url = `https://graph.facebook.com/v19.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: input.toE164.replace(/\D/g, ''),
    type: 'template',
    template: {
      name: env.WHATSAPP_TEMPLATE_NAME,
      language: { code: env.WHATSAPP_TEMPLATE_LANG },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: input.supplierName },
            { type: 'text', text: input.productName },
            { type: 'text', text: input.sku },
            { type: 'text', text: input.city },
            { type: 'text', text: String(input.stock) },
            { type: 'text', text: String(input.reorderThreshold) },
            { type: 'text', text: String(input.suggestedQty) },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        status: 'failed',
        reason: json.error?.message ?? `HTTP ${res.status}`,
        response: json,
      };
    }
    const messageId = json.messages?.[0]?.id;
    if (!messageId) {
      return { ok: false, status: 'failed', reason: 'No message id in provider response', response: json };
    }
    return { ok: true, messageId, response: json };
  } catch (err) {
    return { ok: false, status: 'failed', reason: (err as Error).message };
  }
}

export async function logNotification(input: {
  restockRequestId?: string;
  supplierId?: string;
  status: string;
  providerMessageId?: string;
  providerResponse?: unknown;
  failureReason?: string;
}) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO supplier_notification_logs
      (restock_request_id, supplier_id, status, provider_message_id, provider_response, failure_reason)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      input.restockRequestId ?? null,
      input.supplierId ?? null,
      input.status,
      input.providerMessageId ?? null,
      JSON.stringify(input.providerResponse ?? null),
      input.failureReason ?? null,
    ]
  );
}
