import { env } from '../config/env.js';

function bindSql(sql: string, params: unknown[] = []): string {
  return sql.replace(/\$(\d+)/g, (_, rawIdx: string) => {
    const v = params[Number(rawIdx) - 1];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (Array.isArray(v)) {
      if (v.length === 0) return `ARRAY[]::uuid[]`;
      const inner = v
        .map((item) => {
          if (typeof item === 'number') return String(item);
          return `'${String(item).replace(/'/g, "''")}'`;
        })
        .join(',');
      if (typeof v[0] === 'string' && String(v[0]).includes('-')) {
        return `ARRAY[${inner}]::uuid[]`;
      }
      return `ARRAY[${inner}]`;
    }
    if (typeof v === 'object') {
      return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    }
    return `'${String(v).replace(/'/g, "''")}'`;
  });
}

type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  rowCount: number | null;
};

async function runServiceSql(q: string): Promise<unknown[]> {
  if (!env.SUPABASE_URL) throw new Error('SUPABASE_URL missing');
  if (!env.CELERITY_BRIDGE_SECRET) throw new Error('CELERITY_BRIDGE_SECRET missing');
  const anon = env.SUPABASE_ANON_KEY;
  if (!anon) throw new Error('SUPABASE_ANON_KEY missing');

  const res = await fetch(`${env.SUPABASE_URL}/functions/v1/service-sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      'x-celerity-bridge': env.CELERITY_BRIDGE_SECRET,
    },
    body: JSON.stringify({ q }),
  });
  const json = (await res.json()) as { data?: unknown; error?: string };
  if (!res.ok) throw new Error(json.error || `service-sql HTTP ${res.status}`);
  return Array.isArray(json.data) ? json.data : [];
}

export class SqlBridge {
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const trimmed = sql.trim();
    if (/^(begin|commit|rollback)/i.test(trimmed)) {
      return { rows: [], rowCount: 0 };
    }
    const cleaned = sql
      .replace(/\bfor\s+update\b/gi, '')
      .replace(/\bfor\s+share\b/gi, '')
      .replace(/\bskip\s+locked\b/gi, '');
    const bound = bindSql(cleaned, params ?? []);
    const rows = (await runServiceSql(bound)) as T[];
    return { rows, rowCount: rows.length };
  }

  async connect(): Promise<SqlBridge> {
    return this;
  }

  release() {
    /* no-op */
  }
}

const bridge = new SqlBridge();

export type DbClient = SqlBridge;

export function getPool(): SqlBridge {
  return bridge;
}

export async function ensureDbAccess(): Promise<'edge-bridge'> {
  const rows = await runServiceSql('SELECT 1 AS ok');
  if (!rows?.length) throw new Error('service-sql bridge returned empty');
  return 'edge-bridge';
}

export async function healthCheckDb(): Promise<{
  ok: boolean;
  mode?: string;
  error?: string;
}> {
  try {
    const mode = await ensureDbAccess();
    return { ok: true, mode };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
