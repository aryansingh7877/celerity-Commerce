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

  const headers = {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (res.ok && json.messages?.[0]?.id) {
      return { ok: true, messageId: json.messages[0].id, response: json };
    }

    // Fallback plain text (works inside 24h customer-care window)
    const textBody = {
      messaging_product: 'whatsapp',
      to: input.toE164.replace(/\D/g, ''),
      type: 'text',
      text: {
        preview_url: false,
        body: `Celerity restock alert for ${input.supplierName}:\n${input.productName} (${input.sku}) at ${input.city} is ${input.stock === 0 ? 'OUT OF STOCK' : `low (${input.stock})`}.\nSuggested reorder qty: ${input.suggestedQty}.`,
      },
    };
    const textRes = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(textBody),
    });
    const textJson = (await textRes.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };
    if (textRes.ok && textJson.messages?.[0]?.id) {
      return { ok: true, messageId: textJson.messages[0].id, response: textJson };
    }

    return {
      ok: false,
      status: 'failed',
      reason:
        textJson.error?.message ||
        json.error?.message ||
        `HTTP ${res.status}/${textRes.status}`,
      response: { template: json, text: textJson },
    };
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
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING id`,
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
