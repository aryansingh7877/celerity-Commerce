import { createHash, randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import { getPool } from '../db/pool.js';
import { env } from '../config/env.js';

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
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
    throw new Error(`Resend failed: ${body.slice(0, 200)}`);
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

async function storeLocalCode(userId: string, code: string) {
  const codeHash = hashCode(code);
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
 * Email a 6-digit code to the account inbox.
 * Uses Resend or SMTP — does not use Supabase Auth mailer (avoids their rate limit).
 */
export async function issueEmailTwoStepCode(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const code = String(randomInt(100000, 999999));
  await storeLocalCode(userId, code);

  if (await sendViaResend(normalized, code)) {
    return { delivery: 'email' as const, channel: 'resend' as const };
  }
  if (await sendViaSmtp(normalized, code)) {
    return { delivery: 'email' as const, channel: 'smtp' as const };
  }

  // No provider configured — do not leave a usable code hanging
  await getPool().query(`DELETE FROM email_2fa_codes WHERE user_id = $1`, [userId]);
  throw new Error(
    'No email provider configured. Add RESEND_API_KEY (https://resend.com/api-keys) or SMTP_HOST/SMTP_USER/SMTP_PASS to .env, then restart the API.'
  );
}

export async function verifyEmailTwoStepCode(
  userId: string,
  code: string,
  _email?: string | null
) {
  const cleaned = code.replace(/\s/g, '');
  if (!/^\d{6,8}$/.test(cleaned)) {
    return { ok: false as const, error: 'Enter the 6-digit code from your email.' };
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
    return { ok: false as const, error: 'No code pending. Tap Resend and try again.' };
  }
  return { ok: false as const, error: 'Invalid code.' };
}
