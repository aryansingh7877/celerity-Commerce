import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { healthCheckDb } from './db/pool.js';
import { errorHandler } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { productsRouter, searchRouter } from './routes/products.js';
import { cartRouter, ordersRouter, rescueRouter } from './routes/cartOrders.js';
import { adminRouter } from './routes/admin.js';
import { getOpenSearch } from './services/search.js';
import { getKafka } from './services/kafka.js';

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.use(
  '/api/auth',
  rateLimit({ windowMs: 60_000, max: 60 }),
  authRouter
);

app.get('/api/health', async (_req, res) => {
  const db = await healthCheckDb();
  const os = getOpenSearch();
  let opensearch: { ok: boolean; error?: string } = { ok: false, error: 'not configured' };
  if (os) {
    try {
      await os.cluster.health({});
      opensearch = { ok: true };
    } catch (err) {
      opensearch = { ok: false, error: (err as Error).message };
    }
  }
  const { aiGatewayStatus } = await import('./services/aiGateway.js');
  const { whatsappTemplateStatus } = await import('./services/whatsapp.js');
  const ai = await aiGatewayStatus();
  res.json({
    ok: db.ok,
    database: db,
    kafka: { configured: Boolean(getKafka()), topic: env.KAFKA_TOPIC },
    opensearch,
    whatsapp: whatsappTemplateStatus(),
    ai,
  });
});

app.use('/api/products', productsRouter);
app.use('/api/search', searchRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/rescue', rescueRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

function projectRefFromJwt(token?: string): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8')) as {
      ref?: string;
    };
    return payload.ref ?? null;
  } catch {
    return null;
  }
}

function projectRefFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

app.listen(env.API_PORT, () => {
  console.log(`Celerity API listening on :${env.API_PORT}`);
  if (!env.hasDatabase) console.warn('DATABASE_URL not set — API routes needing DB will fail');
  const urlRef = projectRefFromUrl(env.SUPABASE_URL);
  const serviceRef = projectRefFromJwt(env.SUPABASE_SERVICE_ROLE_KEY);
  if (urlRef && serviceRef && urlRef !== serviceRef) {
    console.warn(
      `[auth] SUPABASE_SERVICE_ROLE_KEY is for project "${serviceRef}" but SUPABASE_URL is "${urlRef}". ` +
        'Replace the service_role key in .env with the one from the matching project (Settings → API). ' +
        'Mismatched keys cause 403s on admin/email/2FA paths.'
    );
  }
});
