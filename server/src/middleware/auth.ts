import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { env } from '../config/env.js';
import { getPool } from '../db/pool.js';
import { HttpError } from './errors.js';

export type AuthUser = {
  id: string;
  email: string | null;
  role: 'customer' | 'admin';
  fullName: string | null;
  preferredCity: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!env.SUPABASE_URL) return null;
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

function claimsFromPayload(payload: {
  sub?: string;
  email?: unknown;
  user_metadata?: unknown;
}): { sub: string; email?: string; name?: string } {
  if (!payload.sub) throw new HttpError(401, 'Invalid token');
  const meta =
    typeof payload.user_metadata === 'object' && payload.user_metadata
      ? (payload.user_metadata as { full_name?: string })
      : undefined;
  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: meta?.full_name ? String(meta.full_name) : undefined,
  };
}

async function verifyToken(token: string): Promise<{ sub: string; email?: string; name?: string }> {
  // 1) Modern Supabase signing keys (ES256/RS256) via JWKS
  const set = getJwks();
  if (set) {
    try {
      const { payload } = await jwtVerify(token, set);
      return claimsFromPayload(payload);
    } catch (err) {
      console.warn('[auth] JWKS verify failed:', err instanceof Error ? err.message : err);
    }
  }

  // 2) Legacy shared secret (HS256) — only if configured and correct
  if (env.SUPABASE_JWT_SECRET) {
    try {
      const key = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
      const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
      return claimsFromPayload(payload);
    } catch (err) {
      console.warn('[auth] HS256 verify failed:', err instanceof Error ? err.message : err);
    }
  }

  // 3) Dev-only decode so a wrong JWT secret cannot lock out the local app
  if (env.NODE_ENV !== 'production') {
    try {
      const payload = decodeJwt(token);
      console.warn('[auth] JWT accepted without signature verify (non-production fallback)');
      return claimsFromPayload(payload);
    } catch {
      /* fall through */
    }
  }

  throw new HttpError(401, 'Cannot verify JWT');
}

export async function upsertProfileFromToken(claims: {
  sub: string;
  email?: string;
  name?: string;
}): Promise<AuthUser> {
  const pool = getPool();
  const email = claims.email?.toLowerCase() ?? null;
  const bootstrapAdmin = email && env.adminEmails.includes(email);

  const existing = await pool.query<{ role: string }>(
    'SELECT role FROM profiles WHERE id = $1',
    [claims.sub]
  );

  let role: 'customer' | 'admin' =
    existing.rows[0]?.role === 'admin' ? 'admin' : 'customer';
  if (bootstrapAdmin) role = 'admin';

  const res = await pool.query<{
    id: string;
    email: string | null;
    full_name: string | null;
    role: 'customer' | 'admin';
    preferred_city: string | null;
  }>(
    `INSERT INTO profiles (id, email, full_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, profiles.email),
       full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
       role = CASE
         WHEN profiles.role = 'admin' THEN 'admin'
         WHEN EXCLUDED.role = 'admin' THEN 'admin'
         ELSE profiles.role
       END,
       updated_at = now()
     RETURNING id, email, full_name, role, preferred_city`,
    [claims.sub, email, claims.name ?? null, role]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    preferredCity: row.preferred_city,
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Missing Bearer token');
    const token = header.slice(7);
    const claims = await verifyToken(token);
    req.user = await upsertProfileFromToken(claims);
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    console.error('[auth] requireAuth failed:', err);
    next(new HttpError(401, err instanceof Error ? err.message : 'Unauthorized'));
  }
}

export function requireRole(...roles: Array<'customer' | 'admin'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Unauthorized'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Forbidden'));
    next();
  };
}
