import { ensureDbAccess } from './pool.js';

/**
 * Schema is applied via Supabase MCP / Dashboard migrations.
 * This script verifies the service_role SQL bridge is reachable.
 */
export async function runMigrations(): Promise<string[]> {
  const mode = await ensureDbAccess();
  console.log(`DB ready via ${mode} (commerce schema already on Supabase)`);
  return [];
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun || process.argv[1]?.includes('migrate')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
