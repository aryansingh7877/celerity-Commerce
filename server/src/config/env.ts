import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
loadDotenv({ path: path.join(root, '.env') });

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  API_PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://127.0.0.1:3001'),

  DATABASE_URL: z.string().min(1).optional(),
  PGHOST: z.string().optional(),
  PGPORT: z.coerce.number().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  PGSSL: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CELERITY_BRIDGE_SECRET: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAILS: z.string().default(''),

  KAFKA_BROKERS: z.string().optional(),
  KAFKA_USERNAME: z.string().optional(),
  KAFKA_PASSWORD: z.string().optional(),
  KAFKA_TOPIC: z.string().default('aiven.celerity.inventory-events'),
  KAFKA_SSL: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  KAFKA_SASL_MECHANISM: z.string().default('scram-sha-256'),

  OPENSEARCH_URL: z.string().optional(),
  OPENSEARCH_USERNAME: z.string().optional(),
  OPENSEARCH_PASSWORD: z.string().optional(),
  OPENSEARCH_INDEX: z.string().default('celerity-products'),

  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_TEMPLATE_LANG: z.string().default('en'),

  OLLAMA_URL: z.string().default('http://127.0.0.1:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:7b'),

  OUTBOX_POLL_MS: z.coerce.number().default(3000),
  OUTBOX_BATCH: z.coerce.number().default(20),
  DEAD_STOCK_DAYS: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema> & {
  adminEmails: string[];
  hasDatabase: boolean;
  hasKafka: boolean;
  hasOpenSearch: boolean;
  hasWhatsApp: boolean;
};

function buildDatabaseUrl(raw: z.infer<typeof envSchema>): string | undefined {
  if (raw.DATABASE_URL) return raw.DATABASE_URL;
  if (raw.PGHOST && raw.PGUSER && raw.PGDATABASE) {
    const port = raw.PGPORT ?? 5432;
    const pass = encodeURIComponent(raw.PGPASSWORD ?? '');
    return `postgres://${raw.PGUSER}:${pass}@${raw.PGHOST}:${port}/${raw.PGDATABASE}?sslmode=require`;
  }
  return undefined;
}

const parsed = envSchema.parse(process.env);
const databaseUrl = buildDatabaseUrl(parsed);

export const env: Env = {
  ...parsed,
  DATABASE_URL: databaseUrl,
  adminEmails: parsed.ADMIN_BOOTSTRAP_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  hasDatabase: Boolean(databaseUrl),
  hasKafka: Boolean(parsed.KAFKA_BROKERS),
  hasOpenSearch: Boolean(parsed.OPENSEARCH_URL),
  hasWhatsApp: Boolean(
    parsed.WHATSAPP_ACCESS_TOKEN &&
      parsed.WHATSAPP_PHONE_NUMBER_ID &&
      parsed.WHATSAPP_TEMPLATE_NAME
  ),
};
