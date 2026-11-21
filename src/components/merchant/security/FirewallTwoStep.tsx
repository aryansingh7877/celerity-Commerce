import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Mail,
  Smartphone,
  QrCode,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
  challengeTotpFactor,
  enrollTotpFactor,
  getEmailTwoStepEnabled,
  listVerifiedTotpFactors,
  setEmailTwoStepEnabled,
  unenrollTotpFactor,
  verifyTotpCode,
} from '../../../lib/supabase/mfa';

/**
 * Firewall two-step — enable authenticator and/or email; user chooses at login.
 */
export const FirewallTwoStep: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [emailOn, setEmailOn] = useState(false);
  const [totpFactors, setTotpFactors] = useState<Array<{ id: string; friendly_name?: string }>>(
    []
  );

  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // TOTP enroll draft
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [emailEnabled, { factors }] = await Promise.all([
      getEmailTwoStepEnabled(user.id),
      listVerifiedTotpFactors(),
    ]);
    setEmailOn(emailEnabled);
    setTotpFactors(factors);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enableEmail = async () => {
    if (!user?.id) {
      setError('Sign in again to enable email verification.');
      return;
    }
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      // Enable only — retailers enter email and receive a code at login (no API keys for them).
      const { error: updErr } = await setEmailTwoStepEnabled(user.id, true);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setEmailOn(true);
      setOkMsg(
        'Email verification enabled. At sign-in, enter your email to receive a 6-digit code.'
      );
    } finally {
      setBusy(false);
    }
  };

  const disableEmail = async () => {
    if (!user?.id) return;
    if (!window.confirm('Disable email two-step?')) return;
    setBusy(true);
    setError(null);
    try {
      const { error: updErr } = await setEmailTwoStepEnabled(user.id, false);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      setEmailOn(false);
      setOkMsg('Email two-step disabled.');
    } finally {
      setBusy(false);
    }
  };

  const startTotp = async () => {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const { data, error: err } = await enrollTotpFactor('Celerity Authenticator');
      if (err || !data) {
        setError(err?.message || 'Could not start authenticator enrollment.');
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setEnrolling(true);
    } finally {
      setBusy(false);
    }
  };

  const confirmTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: chErr } = await challengeTotpFactor(factorId);
      if (chErr || !challenge?.id) {
        setError(chErr?.message || 'Challenge failed');
        return;
      }
      const { error: vErr } = await verifyTotpCode({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) {
        setError(vErr.message || 'Invalid code');
        return;
      }
      setEnrolling(false);
      setQr(null);
      setSecret(null);
      setCode('');
      setOkMsg('Authenticator app linked. You can choose it at sign-in.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const removeTotp = async (id: string) => {
    if (!window.confirm('Remove this authenticator?')) return;
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await unenrollTotpFactor(id);
      if (err) {
        setError(err.message);
        return;
      }
      setOkMsg('Authenticator removed.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const totpOn = totpFactors.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#C8E8D9] bg-gradient-to-br from-[#EAF4EC] to-white p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#064E36] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#C8E8D9]" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#65B99B]">
              Firewall
            </p>
            <h3 className="font-display text-base font-black text-[#0A2540]">
              Two-step verification
            </h3>
            <p className="text-xs text-[#5E6D64] mt-1 leading-relaxed">
              Enable authenticator, email, or both. At sign-in you choose which method to use.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {okMsg && (
        <div className="flex gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {okMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-[#7C877F] py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-3">
          {/* Authenticator */}
          <div className="rounded-2xl border border-[#E8EBE7] bg-[#FAF9F5] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E8EBE7] flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-[#064E36]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#0A2540]">Authenticator app</p>
                  <span
                    className={`text-[10px] font-bold ${totpOn ? 'text-[#064E36]' : 'text-amber-700'}`}
                  >
                    {totpOn ? 'On' : 'Off'}
                  </span>
                </div>
                <p className="text-[11px] text-[#7C877F] mt-0.5">
                  Google Authenticator, 1Password, Authy — scan QR once.
                </p>
              </div>
            </div>

            {enrolling ? (
              <form onSubmit={confirmTotp} className="space-y-3 rounded-xl bg-white border border-[#E8EBE7] p-3">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#0A2540]">
                  <QrCode className="w-3.5 h-3.5" /> Scan QR
                </div>
                {qr ? (
                  <div className="mx-auto w-48 h-48 rounded-xl border border-[#E8EBE7] p-2 bg-white flex items-center justify-center overflow-hidden">
                    {qr.startsWith('data:image') || qr.startsWith('http') ? (
                      <img src={qr} alt="Authenticator QR" className="h-full w-full object-contain" />
                    ) : qr.trim().startsWith('<svg') ? (
                      <div
                        className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: qr }}
                      />
                    ) : (
                      <img
                        src={`data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`}
                        alt="Authenticator QR"
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                ) : null}
                {secret ? (
                  <p className="text-[10px] text-center text-[#7C877F] break-all">
                    Secret: <code className="font-mono text-[#0A2540]">{secret}</code>
                  </p>
                ) : null}
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8EBE7] text-center font-black tracking-[0.3em] outline-none focus:border-[#064E36]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnrolling(false);
                      setQr(null);
                      setSecret(null);
                      setCode('');
                    }}
                    className="flex-1 py-2 rounded-xl border border-[#E8EBE7] text-[11px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || code.length !== 6}
                    className="flex-1 py-2 rounded-xl bg-[#064E36] text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
                  >
                    {busy ? '…' : 'Activate'}
                  </button>
                </div>
              </form>
            ) : totpOn ? (
              <div className="space-y-2">
                {totpFactors.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white border border-[#E8EBE7] px-3 py-2"
                  >
                    <p className="text-[11px] font-bold text-[#0A2540]">
                      {f.friendly_name || 'Authenticator'}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeTotp(f.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void startTotp()}
                className="w-full py-2.5 rounded-xl bg-[#0A2540] text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Starting…' : 'Enable authenticator'}
              </button>
            )}
          </div>

          {/* Email */}
          <div className="rounded-2xl border border-[#E8EBE7] bg-[#FAF9F5] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E8EBE7] flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-[#064E36]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#0A2540]">Email code</p>
                  <span
                    className={`text-[10px] font-bold ${emailOn ? 'text-[#064E36]' : 'text-amber-700'}`}
                  >
                    {emailOn ? 'On' : 'Off'}
                  </span>
                </div>
                <p className="text-[11px] text-[#7C877F] mt-0.5">
                  One-time code sent to {user?.email || 'your email'} after password.
                </p>
              </div>
            </div>
            {emailOn ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void disableEmail()}
                className="w-full py-2.5 rounded-xl bg-white border border-red-100 text-red-600 text-[11px] font-bold cursor-pointer disabled:opacity-60"
              >
                Disable email
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void enableEmail()}
                className="w-full py-2.5 rounded-xl bg-[#0A2540] text-white text-[11px] font-bold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Sending test…' : 'Enable email'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
