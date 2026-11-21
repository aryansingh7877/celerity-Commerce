import { env } from './config/env.js';
import app from './app.js';

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

if (!process.env.VERCEL) {
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
}

export default app;
