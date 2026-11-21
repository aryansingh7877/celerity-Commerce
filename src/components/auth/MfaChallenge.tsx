import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, AlertCircle, ArrowRight, Mail, Smartphone } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import {
  TwoStepMethod,
  challengeTotpFactor,
  getTwoStepAvailability,
  listVerifiedTotpFactors,
  sendEmailTwoStepCode,
  verifyEmailTwoStepCode,
  verifyTotpCode,
} from '../../lib/supabase/mfa';

interface MfaChallengeProps {
  onVerified: () => Promise<void> | void;
  onCancel: () => Promise<void> | void;
}

export const MfaChallenge: React.FC<MfaChallengeProps> = ({ onVerified, onCancel }) => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<TwoStepMethod>('email');
  const [canEmail, setCanEmail] = useState(false);
  const [canTotp, setCanTotp] = useState(false);

  const [emailInput, setEmailInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      // Always unlock via email OTP first (reliable for both portals).
      // Authenticator is optional — only offer it if challenge can start.
      const avail = await getTwoStepAvailability(user.id);
      if (cancelled) return;
      setCanEmail(true);
      setEmailInput(user.email || '');
      setMethod('email');
      if (avail.totp) {
        const { factors } = await listVerifiedTotpFactors();
        const factor = factors[0];
        if (factor) {
          const { data, error: chErr } = await challengeTotpFactor(factor.id);
          if (!cancelled && data?.id && !chErr) {
            setCanTotp(true);
            setFactorId(factor.id);
            setChallengeId(data.id);
          } else {
            // Stuck / forbidden TOTP factor — keep email path only
            setCanTotp(false);
          }
        }
      } else {
        setCanTotp(false);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  // Prepare TOTP only — email waits until retailer enters address and taps Send
  useEffect(() => {
    let cancelled = false;
    setCode('');
    setError(null);
    setInfo(null);
    setFactorId(null);
    setChallengeId(null);
    setCodeSent(false);

    (async () => {
      if (loading || !user?.id) return;
      if (method === 'email' && canEmail) {
        setInfo('Enter any email address to receive a 6-digit code, then tap Send code.');
        return;
      }
      if (method === 'totp' && canTotp) {
        const { factors, error: listErr } = await listVerifiedTotpFactors();
        if (cancelled) return;
        if (listErr || !factors[0]) {
          setCanTotp(false);
          setMethod('email');
          setError('Authenticator unavailable. Use email code instead.');
          return;
        }
        setFactorId(factors[0].id);
        const { data, error: chErr } = await challengeTotpFactor(factors[0].id);
        if (cancelled) return;
        if (chErr || !data?.id) {
          setCanTotp(false);
          setMethod('email');
          setError(
            chErr?.message ||
              'Authenticator challenge blocked. Use the email code option instead.'
          );
          return;
        }
        setChallengeId(data.id);
        setInfo('Open your authenticator app and enter the 6-digit code.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [method, canEmail, canTotp, loading, user?.id]);

  const methods = useMemo(() => {
    const list: Array<{ id: TwoStepMethod; label: string; icon: typeof Mail }> = [];
    if (canTotp) list.push({ id: 'totp', label: 'Authenticator', icon: Smartphone });
    if (canEmail) list.push({ id: 'email', label: 'Email code', icon: Mail });
    return list;
  }, [canEmail, canTotp]);

  const sendCode = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const { error: sErr, channel } = await sendEmailTwoStepCode(email);
      if (sErr) {
        setError(sErr.message || 'Could not send email code.');
        setCodeSent(false);
        return;
      }
      setCodeSent(true);
      if (channel === 'console') {
        setInfo(
          `Mail provider could not deliver to ${email}. Use the 6-digit code printed in the API terminal (shared .env / Resend test mode).`
        );
      } else {
        setInfo(`Code sent to ${email}. Check inbox / spam.`);
      }
    } finally {
      setSending(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'email' && !codeSent) {
      await sendCode();
      return;
    }

    const token = code.replace(/\s/g, '');
    if (!/^\d{6,8}$/.test(token)) {
      setError('Enter the verification code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (method === 'email') {
        const email = emailInput.trim().toLowerCase();
        if (!email) {
          setError('Enter your email address.');
          return;
        }
        const { error: vErr } = await verifyEmailTwoStepCode(email, token);
        if (vErr) {
          setError(vErr.message || 'Invalid or expired email code.');
          return;
        }
      } else {
        if (!factorId || !challengeId) {
          setError('Authenticator challenge is not ready yet.');
          return;
        }
        const { error: vErr } = await verifyTotpCode({
          factorId,
          challengeId,
          code: token,
        });
        if (vErr) {
          setError(vErr.message || 'Invalid authenticator code.');
          const { data } = await challengeTotpFactor(factorId);
          if (data?.id) setChallengeId(data.id);
          return;
        }
      }
      await onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070A09] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#0A2540] p-1.5 flex items-center justify-center">
            <BrandLogo className="w-full h-full" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65B99B]">
              Firewall · Two-step verification
            </p>
            <h1 className="font-display text-xl font-black text-[#0A2540]">Choose a method</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold text-[#7C877F]">
            <Loader2 className="w-4 h-4 animate-spin" /> Preparing…
          </div>
        ) : (
          <>
            {methods.length > 1 && (
              <div className="mb-4 grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7]">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      method === m.id
                        ? 'bg-[#0A2540] text-white shadow-sm'
                        : 'text-[#5E6D64] hover:bg-white'
                    }`}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl bg-[#EAF4EC] border border-[#C8E8D9] p-3.5 mb-5 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-[#064E36] shrink-0 mt-0.5" />
              <p className="text-xs text-[#064E36] leading-relaxed">
                {info ||
                  (method === 'email'
                    ? 'Enter your email to receive a 6-digit code.'
                    : 'Enter the code from your authenticator app.')}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {method === 'email' && (
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C877F]">
                    Email address
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setCodeSent(false);
                    }}
                    className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-[#E8EBE7] bg-[#FAF9F5] text-sm font-semibold text-[#0A2540] outline-none focus:border-[#064E36] focus:ring-2 focus:ring-[#65B99B]/30"
                    placeholder="you@business.com"
                    autoFocus
                  />
                </label>
              )}

              {(method === 'totp' || codeSent) && (
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C877F]">
                    {method === 'email' ? 'Email code' : 'Authenticator code'}
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-[#E8EBE7] bg-[#FAF9F5] text-center text-2xl font-black tracking-[0.35em] text-[#0A2540] outline-none focus:border-[#064E36] focus:ring-2 focus:ring-[#65B99B]/30"
                    placeholder="••••••"
                    autoFocus={method === 'totp' || codeSent}
                  />
                </label>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {method === 'email' && !codeSent ? (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0A2540] hover:bg-[#064E36] text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending code…
                    </>
                  ) : (
                    <>
                      Send code <Mail className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0A2540] hover:bg-[#064E36] text-white text-sm font-bold cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      Unlock session <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              {method === 'email' && codeSent && (
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={sending}
                  className="w-full py-2.5 text-xs font-bold text-[#064E36] hover:underline cursor-pointer disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Resend email code'}
                </button>
              )}

              <button
                type="button"
                onClick={() => void onCancel()}
                className="w-full py-2.5 text-xs font-bold text-[#7C877F] hover:text-[#0A2540] cursor-pointer"
              >
                Cancel and sign out
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
