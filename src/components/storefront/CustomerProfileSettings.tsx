import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  MapPin,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { FirewallTwoStep } from '../merchant/security/FirewallTwoStep';

interface CustomerProfileSettingsProps {
  onBack: () => void;
}

export const CustomerProfileSettings: React.FC<CustomerProfileSettingsProps> = ({ onBack }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [preferredCity, setPreferredCity] = useState(
    profile?.preferred_city === 'Mumbai' || profile?.preferred_city === 'Delhi'
      ? profile.preferred_city
      : 'Bengaluru'
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name || user?.user_metadata?.full_name || '');
    const city = profile?.preferred_city;
    if (city === 'Mumbai' || city === 'Delhi' || city === 'Bengaluru' || city === 'Bangalore') {
      setPreferredCity(city === 'Bangalore' ? 'Bengaluru' : city);
    }
  }, [profile, user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      await api('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          preferredCity,
        }),
      });
      await refreshProfile();
      setOkMsg('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#E8EBE7] text-xs font-bold text-[#0A2540] hover:bg-[#EAF4EC] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to shop
        </button>
      </div>

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#65B99B]">
          Account
        </p>
        <h1 className="font-display text-2xl font-black text-[#0A2540] tracking-tight">
          Profile &amp; security
        </h1>
        <p className="text-xs text-[#7C877F] mt-1">
          Manage your customer details and two-step verification.
        </p>
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

      <form
        onSubmit={saveProfile}
        className="rounded-2xl bg-white border border-[#E8EBE7] p-5 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] border border-[#C8E8D9] flex items-center justify-center">
            <User className="w-5 h-5 text-[#064E36]" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm text-[#0A2540]">Profile</h2>
            <p className="text-[11px] text-[#7C877F]">Name and preferred fulfillment city</p>
          </div>
        </div>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C877F]">
            Full name
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-[#E8EBE7] bg-[#FAF9F5] text-sm font-semibold text-[#0A2540] outline-none focus:border-[#064E36] focus:ring-2 focus:ring-[#65B99B]/30"
            placeholder="Your name"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C877F] inline-flex items-center gap-1">
            <Mail className="w-3 h-3" /> Email
          </span>
          <input
            type="email"
            value={profile?.email || user?.email || ''}
            disabled
            className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-[#E8EBE7] bg-[#F3F4F2] text-sm font-semibold text-[#7C877F] cursor-not-allowed"
          />
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C877F] inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Preferred city
          </span>
          <select
            value={preferredCity}
            onChange={(e) => setPreferredCity(e.target.value as 'Bengaluru' | 'Mumbai' | 'Delhi')}
            className="mt-1.5 w-full px-4 py-3 rounded-2xl border border-[#E8EBE7] bg-[#FAF9F5] text-sm font-semibold text-[#0A2540] outline-none focus:border-[#064E36]"
          >
            <option value="Bengaluru">Bengaluru</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#0A2540] hover:bg-[#064E36] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save profile
        </button>
      </form>

      <div className="rounded-2xl bg-white border border-[#E8EBE7] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#064E36] text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#C8E8D9]" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm text-[#0A2540]">Security</h2>
            <p className="text-[11px] text-[#7C877F]">
              Two-step verification — same firewall controls as merchant
            </p>
          </div>
        </div>
        <FirewallTwoStep />
      </div>
    </div>
  );
};
