import { api, ApiError } from '../api';
import { supabase } from './client';

const PASS_KEY = 'celerity_2fa_passed';

export type TwoStepMethod = 'totp' | 'email';

export type TwoStepAvailability = {
  totp: boolean;
  email: boolean;
  any: boolean;
};

export function clearTwoStepPass() {
  try {
    sessionStorage.removeItem(PASS_KEY);
  } catch {
    /* ignore */
  }
}

export function markTwoStepPassed(userId: string) {
  try {
    sessionStorage.setItem(PASS_KEY, userId);
  } catch {
    /* ignore */
  }
}

export function hasTwoStepPassed(userId: string): boolean {
  try {
    return sessionStorage.getItem(PASS_KEY) === userId;
  } catch {
    return false;
  }
}

/** True when the current URL looks like a Supabase email/magic-link callback. */
export function isEmailAuthCallbackUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hay = `${window.location.hash}${window.location.search}`.toLowerCase();
  return (
    hay.includes('type=magiclink') ||
    hay.includes('type=email') ||
    hay.includes('type=signup') ||
    hay.includes('type=invite') ||
    (hay.includes('access_token') && hay.includes('type='))
  );
}

/** --- Email 2FA (profile flag + server OTP codes) --- */

export async function getEmailTwoStepEnabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email_2fa_enabled')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[email-2fa]', error.message);
    return false;
  }
  return Boolean((data as { email_2fa_enabled?: boolean } | null)?.email_2fa_enabled);
}

export async function setEmailTwoStepEnabled(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ email_2fa_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return { error };
}

function asAuthError(err: unknown): { message: string } {
  if (err instanceof ApiError) return { message: err.message };
  if (err instanceof Error) return { message: err.message };
  return { message: 'Request failed' };
}

const DIRECT_OTP_CHANNEL_KEY = 'celerity_email_2fa_channel_v1';
const LOCAL_FALLBACK_OTP_KEY = 'celerity_email_2fa_local_otp_v1';

/** Sends a 6-digit code to the email the retailer entered. Falls back to Supabase Auth OTP or local code if Express API is offline. */
export async function sendEmailTwoStepCode(email: string) {
  const normalized = email.trim().toLowerCase();
  try {
    const res = await api<{
      ok: boolean;
      delivery?: 'email' | 'resend' | 'console';
      channel?: string;
    }>('/api/auth/email-2fa/send', {
      method: 'POST',
      body: JSON.stringify({ email: normalized }),
    });
    sessionStorage.setItem(DIRECT_OTP_CHANNEL_KEY, 'api');
    sessionStorage.removeItem(LOCAL_FALLBACK_OTP_KEY);
    return {
      error: null as null,
      delivery: res.delivery ?? 'email',
      channel: res.channel,
      demoCode: undefined as string | undefined,
    };
  } catch (err) {
    const msg = asAuthError(err).message || '';
    const isOfflineOrNoJwt =
      /failed to fetch|networkerror|load failed|sign in required|valid bearer token/i.test(msg);

    if (!isOfflineOrNoJwt) {
      return {
        error: asAuthError(err),
        delivery: undefined as undefined,
        demoCode: undefined as string | undefined,
      };
    }

    // Fallback 1: Direct Supabase Auth OTP from browser when Express API (127.0.0.1:4000) is not running
    const { error: sbErr } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: false },
    });

    if (!sbErr) {
      sessionStorage.setItem(DIRECT_OTP_CHANNEL_KEY, 'supabase');
      sessionStorage.removeItem(LOCAL_FALLBACK_OTP_KEY);
      return {
        error: null as null,
        delivery: 'email' as const,
        channel: 'supabase-direct',
        demoCode: undefined as string | undefined,
      };
    }

    // Fallback 2: Local 6-digit OTP when Supabase mailer is rate-limited or unconfirmed
    const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem(DIRECT_OTP_CHANNEL_KEY, 'local-fallback');
    sessionStorage.setItem(
      LOCAL_FALLBACK_OTP_KEY,
      JSON.stringify({ email: normalized, code: fallbackCode, expiresAt: Date.now() + 10 * 60_000 })
    );
    return {
      error: null as null,
      delivery: 'console' as const,
      channel: 'local-fallback',
      demoCode: fallbackCode,
    };
  }
}

export async function verifyEmailTwoStepCode(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  const cleaned = code.replace(/\s/g, '');
  const channel = sessionStorage.getItem(DIRECT_OTP_CHANNEL_KEY);

  if (channel === 'local-fallback') {
    try {
      const raw = sessionStorage.getItem(LOCAL_FALLBACK_OTP_KEY);
      if (!raw) return { error: { message: 'No code pending. Send a code first.' } };
      const parsed = JSON.parse(raw) as { email: string; code: string; expiresAt: number };
      if (Date.now() > parsed.expiresAt) {
        return { error: { message: 'Code expired. Send a new code.' } };
      }
      if (parsed.email !== normalized || parsed.code !== cleaned) {
        return { error: { message: 'Invalid verification code.' } };
      }
      sessionStorage.removeItem(LOCAL_FALLBACK_OTP_KEY);
      sessionStorage.removeItem(DIRECT_OTP_CHANNEL_KEY);
      return { error: null as null };
    } catch {
      return { error: { message: 'Verification failed.' } };
    }
  }

  if (channel === 'supabase') {
    const { error: sbErr } = await supabase.auth.verifyOtp({
      email: normalized,
      token: cleaned,
      type: 'email',
    });
    if (sbErr) {
      return { error: { message: sbErr.message || 'Invalid or expired code.' } };
    }
    sessionStorage.removeItem(DIRECT_OTP_CHANNEL_KEY);
    return { error: null as null };
  }

  try {
    await api<{ ok: boolean }>('/api/auth/email-2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code: cleaned, email: normalized }),
    });
    sessionStorage.removeItem(DIRECT_OTP_CHANNEL_KEY);
    return { error: null as null };
  } catch (err) {
    return { error: asAuthError(err) };
  }
}

/** --- Authenticator TOTP (Supabase MFA) --- */

export async function hasVerifiedTotpFactor(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return false;
  return (data?.totp || []).some((f) => f.status === 'verified');
}

export async function listVerifiedTotpFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { factors: [] as Array<{ id: string; friendly_name?: string }>, error };
  const factors = (data?.totp || []).filter((f) => f.status === 'verified');
  return { factors, error: null as null };
}

export async function needsTotpChallenge(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.currentLevel === 'aal1' && data.nextLevel === 'aal2';
}

export async function challengeTotpFactor(factorId: string) {
  return supabase.auth.mfa.challenge({ factorId });
}

export async function verifyTotpCode(input: {
  factorId: string;
  challengeId: string;
  code: string;
}) {
  return supabase.auth.mfa.verify({
    factorId: input.factorId,
    challengeId: input.challengeId,
    code: input.code.replace(/\s/g, ''),
  });
}

export async function enrollTotpFactor(friendlyName = 'Celerity Authenticator') {
  return supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName,
  });
}

export async function unenrollTotpFactor(factorId: string) {
  return supabase.auth.mfa.unenroll({ factorId });
}

/** --- Combined --- */

export async function getTwoStepAvailability(userId: string): Promise<TwoStepAvailability> {
  const [email, totp] = await Promise.all([
    getEmailTwoStepEnabled(userId),
    hasVerifiedTotpFactor(),
  ]);
  return { email, totp, any: email || totp };
}

/** Password OK but a second factor is still required for this browser session. */
export async function needsTwoStepChallenge(
  userId: string
): Promise<TwoStepAvailability & { needs: boolean }> {
  if (hasTwoStepPassed(userId)) {
    return { email: false, totp: false, any: false, needs: false };
  }
  const [emailEnabled, totpEnrolled, totpNeeded] = await Promise.all([
    getEmailTwoStepEnabled(userId),
    hasVerifiedTotpFactor(),
    needsTotpChallenge(),
  ]);
  const email = emailEnabled;
  const totp = totpEnrolled;
  const needs = emailEnabled || totpNeeded;
  return { email, totp, any: email || totp, needs };
}
