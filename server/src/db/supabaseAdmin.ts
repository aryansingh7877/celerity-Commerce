import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for DB access');
  }
  if (!admin) {
    admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export async function healthCheckSupabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from('profiles').select('id').limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
