import { createHash, randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import { getPool } from '../db/pool.js';
import { env } from '../config/env.js';

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function projectRefFromUrl(url: string): string {
  try {
    return new URL(url).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

function jwtRef(token: string): string {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8')) as {
      ref?: string;
    };
    return payload.ref || '';
  } catch {
    return '';
  }
}

function authApiKey(): string {
  const ref = projectRefFromUrl(env.SUPABASE_URL || '');
  const candidates = [env.SUPABASE_ANON_KEY, env.SUPABASE_SERVICE_ROLE_KEY].filter(
    (k): k is string => Boolean(k)
  );
  const matched = candidates.find((k) => !jwtRef(k) || jwtRef(k) === ref);
  const key = matched || candidates[0];
  if (!env.SUPABASE_URL || !key) {
    throw new Error('Email delivery is not available right now. Try again shortly.');
  }
  return key;
}

function authHeaders(): Record<string, string> {
  const key = authApiKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function codeEmailContent(code: string) {
  const subject = 'Your Celerity verification code';
  const text = `Your Celerity firewall verification code is: ${code}\n\nIt expires in 10 minutes. If you did not try to sign in, ignore this email.`;
  const html = `<p>Your Celerity firewall verification code is:</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
    <p>It expires in 10 minutes.</p>`;
  return { subject, text, html };
}

async function sendViaResend(to: string, code: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const from = env.EMAIL_FROM || 'Celerity Security <onboarding@resend.dev>';
  const { subject, text, html } = codeEmailContent(code);
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Could not send email: ${body.slice(0, 160)}`);
  }
  return true;
}

async function sendViaSmtp(to: string, code: string): Promise<boolean> {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return false;
  const from = env.EMAIL_FROM || env.SMTP_USER;
  const { subject, text, html } = codeEmailContent(code);
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: (env.SMTP_PORT || 587) === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  await transporter.sendMail({ from, to, subject, text, html });
  return true;
}

/** Built-in Supabase mailer — retailers never configure API keys. */
async function sendViaSupabaseAuth(email: string): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      create_user: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429 || /rate.?limit/i.test(body)) {
      throw new Error('Too many emails sent. Wait a minute and try again.');
    }
    throw new Error(`Could not send email code. ${body.slice(0, 120)}`);
  }
}

async function verifyViaSupabaseAuth(email: string, token: string): Promise<boolean> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      type: 'email',
      email: email.trim().toLowerCase(),
      token,
    }),
  });
  return res.ok;
}

async function storeLocalCode(userId: string, code: string, channel: 'local' | 'supabase') {
  const codeHash = channel === 'supabase' ? hashCode(`supabase:${userId}`) : hashCode(code);
  await getPool().query(
    `INSERT INTO email_2fa_codes (user_id, code_hash, expires_at, attempts)
     VALUES ($1, $2, now() + interval '10 minutes', 0)
     ON CONFLICT (user_id) DO UPDATE SET
       code_hash = EXCLUDED.code_hash,
       expires_at = EXCLUDED.expires_at,
       attempts = 0,
       created_at = now()`,
    [userId, codeHash]
  );
}

async function getPendingChannel(userId: string): Promise<'local' | 'supabase' | null> {
  const row = await getPool().query<{ code_hash: string; expires_at: string }>(
    `SELECT code_hash, expires_at FROM email_2fa_codes WHERE user_id = $1`,
    [userId]
  );
  const current = row.rows[0];
  if (!current) return null;
  if (new Date(current.expires_at).getTime() < Date.now()) return null;
  return current.code_hash === hashCode(`supabase:${userId}`) ? 'supabase' : 'local';
}

async function verifyLocalCode(userId: string, code: string) {
  const row = await getPool().query<{
    code_hash: string;
    expires_at: string;
    attempts: number;
  }>(`SELECT code_hash, expires_at, attempts FROM email_2fa_codes WHERE user_id = $1`, [userId]);

  const current = row.rows[0];
  if (!current) return { ok: false as const, reason: 'missing' as const };
  if (Number(current.attempts) >= 5) return { ok: false as const, reason: 'attempts' as const };
  if (new Date(current.expires_at).getTime() < Date.now()) {
    return { ok: false as const, reason: 'expired' as const };
  }
  if (current.code_hash !== hashCode(code)) {
    await getPool().query(`UPDATE email_2fa_codes SET attempts = attempts + 1 WHERE user_id = $1`, [
      userId,
    ]);
    return { ok: false as const, reason: 'invalid' as const };
  }
  await getPool().query(`DELETE FROM email_2fa_codes WHERE user_id = $1`, [userId]);
  return { ok: true as const };
}

/**
 * Send a 6-digit code to the email the retailer entered.
 * Server may use Resend/SMTP if configured; otherwise Supabase Auth mail (no retailer API keys).
 */
export async function issueEmailTwoStepCode(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Enter a valid email address.');
  }

  const hasCustomMail =
    Boolean(env.RESEND_API_KEY) || Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

  if (hasCustomMail) {
    const code = String(randomInt(100000, 999999));
    await storeLocalCode(userId, code, 'local');
    try {
      if (await sendViaResend(normalized, code)) {
        return { delivery: 'email' as const, channel: 'resend' as const };
      }
      if (await sendViaSmtp(normalized, code)) {
        return { delivery: 'email' as const, channel: 'smtp' as const };
      }
    } catch (err) {
      await getPool().query(`DELETE FROM email_2fa_codes WHERE user_id = $1`, [userId]);
      throw err;
    }
    await getPool().query(`DELETE FROM email_2fa_codes WHERE user_id = $1`, [userId]);
  }

  await sendViaSupabaseAuth(normalized);
  await storeLocalCode(userId, 'pending', 'supabase');
  return { delivery: 'email' as const, channel: 'supabase' as const };
}

export async function verifyEmailTwoStepCode(
  userId: string,
  code: string,
  email?: string | null
) {
  const cleaned = code.replace(/\s/g, '');
  if (!/^\d{6,8}$/.test(cleaned)) {
    return { ok: false as const, error: 'Enter the 6-digit code from your email.' };
  }

  const channel = await getPendingChannel(userId);
  if (channel === 'supabase') {
    if (!email) {
      return { ok: false as const, error: 'Enter the email you used to request the code.' };
    }
    const ok = await verifyViaSupabaseAuth(email, cleaned);
    if (!ok) return { ok: false as const, error: 'Invalid or expired code.' };
    await getPool().query(`DELETE FROM email_2fa_codes WHERE user_id = $1`, [userId]);
    return { ok: true as const };
  }

  const local = await verifyLocalCode(userId, cleaned);
  if (local.ok) return { ok: true as const };
  if (local.reason === 'attempts') {
    return { ok: false as const, error: 'Too many attempts. Request a new code.' };
  }
  if (local.reason === 'expired') {
    return { ok: false as const, error: 'Code expired. Request a new one.' };
  }
  if (local.reason === 'missing') {
    return { ok: false as const, error: 'No code pending. Enter your email and send a code first.' };
  }
  return { ok: false as const, error: 'Invalid code.' };
}
