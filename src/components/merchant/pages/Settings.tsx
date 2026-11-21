import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, ShieldCheck, Bell, Store, User, Sliders } from 'lucide-react';

interface SettingsPageProps {
  merchantName?: string;
  merchantEmail?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  merchantName = 'Aryan Singh',
  merchantEmail = 'aryansingh787769@gmail.com',
}) => {
  const [storeName, setStoreName] = useState('Celerity Flagship Electronics');
  const [adminName, setAdminName] = useState(merchantName);
  const [email, setEmail] = useState(merchantEmail);
  const [currency, setCurrency] = useState('INR (₹)');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoRebalance, setAutoRebalance] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── 1. Page Header ── */}
      <div className="pb-2 border-b border-[#E8EBE7]">
        <h1 className="font-display font-extrabold text-2xl text-[#202A24] tracking-tight">
          Merchant Settings & Preferences
        </h1>
        <p className="text-xs text-[#7C877F] mt-1 font-medium">
          Configure store identity, automated low-stock thresholds, and multi-hub notifications.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-[#DCEFE3] border border-[#064E36]/30 flex items-center gap-3 text-[#064E36] text-xs font-bold animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Merchant settings and threshold configurations successfully updated!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store & Profile Info */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8EBE7] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E8EBE7]">
            <Store className="w-4 h-4 text-[#064E36]" />
            <h2 className="font-display font-bold text-base text-[#202A24]">Store & Merchant Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                Merchant Store Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs text-[#202A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                Primary Currency
              </label>
              <input
                type="text"
                disabled
                value={currency}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-semibold text-[#7C877F] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                Store Administrator
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs text-[#202A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                Notification Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs text-[#202A24]"
              />
            </div>
          </div>
        </div>

        {/* Inventory Rules & Thresholds */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8EBE7] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E8EBE7]">
            <Sliders className="w-4 h-4 text-[#064E36]" />
            <h2 className="font-display font-bold text-base text-[#202A24]">
              Inventory Alert Thresholds
            </h2>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1">
              Low Stock Threshold (Units)
            </label>
            <p className="text-[11px] text-[#7C877F] mb-2">
              SKUs with available stock equal or below this number trigger visual warnings in the dashboard.
            </p>
            <input
              type="number"
              min="1"
              max="100"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              className="w-32 px-4 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-sm font-bold text-[#064E36]"
            />
          </div>

          <div className="pt-3 border-t border-[#E8EBE7] space-y-3">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F5] cursor-pointer">
              <div>
                <p className="text-xs font-bold text-[#202A24]">Email Out-of-Stock Alerts</p>
                <p className="text-[11px] text-[#7C877F]">Receive instant emails when a product reaches 0 stock</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#064E36] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F5] cursor-pointer">
              <div>
                <p className="text-xs font-bold text-[#202A24]">Automatic Hub Rebalancing Recommendations</p>
                <p className="text-[11px] text-[#7C877F]">Suggest cross-hub stock transfer when Bangalore, Mumbai or Delhi runs low</p>
              </div>
              <input
                type="checkbox"
                checked={autoRebalance}
                onChange={(e) => setAutoRebalance(e.target.checked)}
                className="w-4 h-4 accent-[#064E36] cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-[#064E36] hover:bg-[#103C2D] text-white font-display font-bold text-xs shadow-md shadow-[#064E36]/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
