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
  res.json({
    ok: db.ok,
    database: db,
    kafka: { configured: Boolean(getKafka()), topic: env.KAFKA_TOPIC },
    opensearch,
    whatsapp: { configured: env.hasWhatsApp },
    ollama: { url: env.OLLAMA_URL, model: env.OLLAMA_MODEL },
  });
});

app.use('/api/products', productsRouter);
app.use('/api/search', searchRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/rescue', rescueRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

app.listen(env.API_PORT, () => {
  console.log(`Celerity API listening on :${env.API_PORT}`);
  if (!env.hasDatabase) console.warn('DATABASE_URL not set — API routes needing DB will fail');
});
