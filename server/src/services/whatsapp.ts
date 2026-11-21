import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';

export type WhatsAppSendResult =
  | { ok: true; messageId: string; response: unknown }
  | {
      ok: false;
      status: 'pending_configuration' | 'failed';
      reason: string;
      response?: unknown;
      code?: string;
    };

/** Expected body parameter count for the configured restock template. */
export const WHATSAPP_TEMPLATE_PARAM_COUNT = 7;

export function whatsappTemplateStatus() {
  return {
    configured: env.hasWhatsApp,
    templateName: env.WHATSAPP_TEMPLATE_NAME || null,
    language: env.WHATSAPP_TEMPLATE_LANG || 'en',
    expectedBodyParams: WHATSAPP_TEMPLATE_PARAM_COUNT,
    paramOrder: [
      'supplierName',
      'productName',
      'sku',
      'city',
      'stock',
      'reorderThreshold',
      'suggestedQty',
    ],
    mode: 'template_only' as const,
  };
}

/**
 * Template-only WhatsApp Cloud API send.
 * Plain-text fallback removed (P0).
 */
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
      reason:
        'WhatsApp credentials missing (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME)',
      code: 'WHATSAPP_NOT_CONFIGURED',
    };
  }

  const to = input.toE164.replace(/\D/g, '');
  if (!to || to.length < 8) {
    return {
      ok: false,
      status: 'failed',
      reason: 'Invalid supplier phone number',
      code: 'INVALID_PHONE',
    };
  }

  const url = `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
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
      error?: { message?: string; code?: number; error_data?: unknown };
    };
    if (res.ok && json.messages?.[0]?.id) {
      return { ok: true, messageId: json.messages[0].id, response: json };
    }
    return {
      ok: false,
      status: 'failed',
      reason: json.error?.message || `WhatsApp HTTP ${res.status}`,
      code: json.error?.code != null ? String(json.error.code) : 'WHATSAPP_API_ERROR',
      response: json,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'failed',
      reason: (err as Error).message,
      code: 'WHATSAPP_NETWORK_ERROR',
    };
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
  const result = await pool.query<{ id: string }>(
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
  return result.rows[0]?.id;
}
