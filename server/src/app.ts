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
    origin: (origin, cb) => {
      const allowed = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
      if (!origin || allowed.includes('*') || allowed.includes(origin)) {
        cb(null, true);
        return;
      }
      // Allow Vercel preview/production hosts for this project
      if (/\.vercel\.app$/i.test(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
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

export default app;
