import { api, ApiError } from '../api';
import { supabase } from './client';

const PASS_KEY = 'celerity_2fa_passed';
const INTENT_KEY = 'celerity_login_intent';

export type TwoStepMethod = 'totp' | 'email';

export type TwoStepAvailability = {
  totp: boolean;
  email: boolean;
  any: boolean;
};

/** Portal the user picked on the shared login page (Customer / Merchant). */
function currentPortal(): 'customer' | 'merchant' {
  try {
    const v = sessionStorage.getItem(INTENT_KEY);
    if (v === 'merchant' || v === 'customer') return v;
  } catch {
    /* ignore */
  }
  return 'customer';
}

function passToken(userId: string, portal = currentPortal()) {
  return `${userId}:${portal}`;
}

export function clearTwoStepPass() {
  try {
    sessionStorage.removeItem(PASS_KEY);
  } catch {
    /* ignore */
  }
}

/** Marks 2FA complete for this user + current portal only. */
export function markTwoStepPassed(userId: string) {
  try {
    sessionStorage.setItem(PASS_KEY, passToken(userId));
  } catch {
    /* ignore */
  }
}

/** True only if 2FA was completed for this user on the current portal. */
export function hasTwoStepPassed(userId: string): boolean {
  try {
    return sessionStorage.getItem(PASS_KEY) === passToken(userId);
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

/** Sends a 6-digit code to the email the retailer entered. */
export async function sendEmailTwoStepCode(email: string) {
  try {
    const res = await api<{
      ok: boolean;
      delivery?: 'email' | 'resend' | 'console';
      channel?: string;
    }>('/api/auth/email-2fa/send', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    return { error: null as null, delivery: res.delivery ?? 'email', channel: res.channel };
  } catch (err) {
    return { error: asAuthError(err), delivery: undefined as undefined };
  }
}

export async function verifyEmailTwoStepCode(email: string, code: string) {
  try {
    await api<{ ok: boolean }>('/api/auth/email-2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code, email: email.trim().toLowerCase() }),
    });
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
