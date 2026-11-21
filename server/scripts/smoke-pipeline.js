/**
 * Smoke-check backend pipeline RPCs against a live Supabase project.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run pipeline:smoke
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL and a key (service role preferred)');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [];

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
    console.log(`✓ ${name}`);
  } catch (err) {
    checks.push({ name, ok: false, error: err.message });
    console.error(`✗ ${name}: ${err.message}`);
  }
}

await check('products readable', async () => {
  const { error } = await supabase.from('products').select('id').limit(1);
  if (error) throw error;
});

await check('stores readable', async () => {
  const { error } = await supabase.from('stores').select('id').limit(1);
  if (error) throw error;
});

await check('find_alternatives rpc', async () => {
  const { data: products, error: pErr } = await supabase.from('products').select('id').limit(1);
  if (pErr) throw pErr;
  if (!products?.length) throw new Error('no products — run seed migration');
  const { error } = await supabase.rpc('find_alternatives', {
    p_product_id: products[0].id,
    p_store_id: null,
    p_limit: 3,
  });
  if (error) throw error;
});

await check('outbox table', async () => {
  const { error } = await supabase.from('outbox').select('id').limit(1);
  if (error) throw error;
});

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
