import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  ShieldCheck,
  Bell,
  Store,
  User,
  Sliders,
  Mail,
  Phone,
  MapPin,
  BarChart3,
  Edit2,
  ChevronRight,
  Lock,
  Box,
  Download,
  RotateCcw,
  X,
} from 'lucide-react';
import { Product } from '../../../types/product';
import { BrandLogo } from '../../common/BrandLogo';
import { FirewallTwoStep } from '../security/FirewallTwoStep';

interface SettingsPageProps {
  merchantName?: string;
  merchantEmail?: string;
  products?: Product[];
}

type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'inventory_rules'
  | 'hubs'
  | 'reports';

interface StoredMerchantSettings {
  storeName: string;
  adminName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  autoReorder: boolean;
  autoRebalance: boolean;
  emailAlerts: boolean;
  inAppNotifications: boolean;
  dailyDigest: boolean;
  twoFactorEnabled: boolean;
  enabledHubs: {
    Bangalore: boolean;
    Mumbai: boolean;
    Delhi: boolean;
  };
}

const SETTINGS_STORAGE_KEY = 'celerity_merchant_settings_v1';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  merchantName = 'Abhishek Anil Kumar',
  merchantEmail = '47abhishek123@gmail.com',
  products = [],
}) => {
  const defaultSettings: StoredMerchantSettings = {
    storeName: 'Celerity Flagship Electronics',
    adminName: merchantName,
    email: merchantEmail,
    phone: '+91 98765 43210',
    address: '123 Commerce Street, Bengaluru - 560001',
    currency: 'INR (₹)',
    lowStockThreshold: 10,
    criticalStockThreshold: 20,
    autoReorder: true,
    autoRebalance: true,
    emailAlerts: true,
    inAppNotifications: true,
    dailyDigest: false,
    twoFactorEnabled: true,
    enabledHubs: {
      Bangalore: true,
      Mumbai: true,
      Delhi: true,
    },
  };

  const [settings, setSettings] = useState<StoredMerchantSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch {
      /* ignore */
    }
    return defaultSettings;
  });

  const [activeSubTab, setActiveSubTab] = useState<SettingsTab>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const notifySaved = (msg = 'Settings saved successfully.') => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2800);
  };

  const handleToggle = (key: keyof StoredMerchantSettings, label?: string) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    if (label) notifySaved(`${label} updated.`);
  };

  const handleExportCatalogCSV = () => {
    const header = 'SKU,Name,Category,Price_INR,Stock,Hub\n';
    const rows = products
      .map(
        (p) =>
          `"${p.sku}","${p.name.replace(/"/g, '""')}","${p.category}",${p.price},${p.stock},"${p.location}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'celerity_inventory_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifySaved(`Exported ${products.length} SKUs to CSV.`);
  };

  const navItems: { id: SettingsTab; label: string; icon: typeof Store }[] = [
    { id: 'profile', label: 'Store Profile', icon: Store },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: ShieldCheck },
    { id: 'inventory_rules', label: 'Inventory Rules', icon: Sliders },
    { id: 'hubs', label: 'Multi-Hub Settings', icon: MapPin },
    { id: 'reports', label: 'Reports & Data', icon: BarChart3 },
  ];

  const ToggleSwitch = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 flex items-center ${
        checked ? 'bg-[#064E36]' : 'bg-[#D6DFD9]'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* ── 1. Top Settings Hero Banner (Matching Reference Design) ── */}
      <div className="relative overflow-hidden rounded-3xl border border-[#DCEFE3] bg-gradient-to-r from-[#F6FBF7] via-[#EEF7F1] to-[#DCEFE3]/75 px-6 py-5 sm:px-8 sm:py-6 shadow-2xs">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#C8E8D9]/50 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#DCEFE3] border border-[#C8E8D9] flex items-center justify-center shrink-0">
              <Settings className="w-6 h-6 text-[#064E36]" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl sm:text-3xl text-[#202A24] tracking-tight">
                Merchant Settings
              </h1>
              <p className="text-xs sm:text-sm text-[#5E6D64] mt-0.5 font-medium">
                Manage your store and preferences for a smoother experience.
              </p>
            </div>
          </div>

          {/* Right Vector Storefront + Gear Illustration */}
          <div className="hidden md:flex items-center shrink-0">
            <svg viewBox="0 0 210 95" className="w-48 h-24" aria-hidden="true">
              {/* Gear */}
              <g transform="translate(22, 34)" fill="#2F6E54" opacity="0.9">
                <circle cx="24" cy="24" r="14" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <rect
                    key={deg}
                    x="21"
                    y="3"
                    width="6"
                    height="9"
                    rx="1.5"
                    transform={`rotate(${deg} 24 24)`}
                  />
                ))}
                <circle cx="24" cy="24" r="6" fill="#EEF7F1" />
              </g>
              {/* Storefront Awning Shop */}
              <g transform="translate(82, 8)">
                <rect x="8" y="30" width="96" height="52" rx="4" fill="#FFFFFF" stroke="#C8E8D9" strokeWidth="1.5" />
                {/* Roof Awning */}
                <path d="M2 10 h108 l6 20 H-4 Z" fill="#064E36" />
                <path d="M16 10 h14 l2 20 H14 Z" fill="#C8E8D9" />
                <path d="M46 10 h14 l1 20 H45 Z" fill="#C8E8D9" />
                <path d="M76 10 h14 l-1 20 H75 Z" fill="#C8E8D9" />
                {/* Door & Window */}
                <rect x="20" y="42" width="24" height="40" rx="2" fill="#064E36" />
                <circle cx="39" cy="62" r="2" fill="#E8D58A" />
                <rect x="54" y="42" width="38" height="24" rx="3" fill="#EAF4EC" stroke="#C8E8D9" strokeWidth="1.2" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Save Feedback Toast */}
      {saveToast && (
        <div className="p-3.5 rounded-2xl bg-[#DCEFE3] border border-[#064E36]/25 flex items-center gap-2.5 text-[#064E36] text-xs font-bold shadow-2xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ── 2. Two-Column Split Layout: Left Vertical Nav + Right Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Vertical Navigation Card (3 cols) */}
        <aside className="lg:col-span-3 rounded-2xl bg-white border border-[#E8EBE7] p-3 shadow-2xs space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSubTab(item.id);
                  setIsEditingProfile(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#064E36] text-white shadow-sm'
                    : 'text-[#202A24] hover:bg-[#FAF9F5] hover:text-[#064E36]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#C8E8D9]' : 'text-[#5E6D64]'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Main Content Workspace (9 cols) */}
        <div className="lg:col-span-9 space-y-5">
          {/* ═══════════════════ TAB 1: STORE PROFILE (Reference Layout) ═══════════════════ */}
          {activeSubTab === 'profile' && (
            <>
              {/* Main Store Profile Card */}
              <div className="rounded-2xl bg-white border border-[#E8EBE7] p-6 shadow-2xs space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8EBE7]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] border border-[#C8E8D9] flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-[#064E36]" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-base text-[#202A24]">
                        Store Profile
                      </h2>
                      <p className="text-xs text-[#7C877F]">
                        Update your store details and business information.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#EAF4EC] hover:bg-[#DCEFE3] border border-[#C8E8D9] text-xs font-bold text-[#064E36] transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    {isEditingProfile ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Profile</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Brand Logo + Store Name Row */}
                <div className="flex items-center gap-4 pb-5 border-b border-[#E8EBE7]">
                  <div className="relative w-16 h-16 rounded-2xl bg-[#EAF4EC] border border-[#C8E8D9] p-2 flex items-center justify-center shrink-0">
                    <BrandLogo className="w-full h-full" />
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      title="Edit store identity"
                      className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-[#E8EBE7] shadow-xs flex items-center justify-center text-[#5E6D64] hover:text-[#064E36] cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-display font-black text-lg sm:text-xl text-[#202A24]">
                      {settings.storeName}
                    </h3>
                    <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] text-[11px] font-semibold text-[#5E6D64]">
                      {settings.currency} • Default Currency
                    </span>
                  </div>
                </div>

                {/* Inline Edit Form OR 4-Column Metadata Strip */}
                {isEditingProfile ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setIsEditingProfile(false);
                      notifySaved('Store profile updated.');
                    }}
                    className="space-y-4 pt-1"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C877F] mb-1">
                          Store Name
                        </label>
                        <input
                          type="text"
                          value={settings.storeName}
                          onChange={(e) =>
                            setSettings({ ...settings, storeName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-semibold text-[#202A24]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C877F] mb-1">
                          Store Administrator
                        </label>
                        <input
                          type="text"
                          value={settings.adminName}
                          onChange={(e) =>
                            setSettings({ ...settings, adminName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-semibold text-[#202A24]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C877F] mb-1">
                          Notification Email
                        </label>
                        <input
                          type="email"
                          value={settings.email}
                          onChange={(e) =>
                            setSettings({ ...settings, email: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-semibold text-[#202A24]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C877F] mb-1">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={settings.phone}
                          onChange={(e) =>
                            setSettings({ ...settings, phone: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-semibold text-[#202A24]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7C877F] mb-1">
                          Business Address
                        </label>
                        <input
                          type="text"
                          value={settings.address}
                          onChange={(e) =>
                            setSettings({ ...settings, address: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-semibold text-[#202A24]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl border border-[#E8EBE7] text-xs font-bold text-[#7C877F] hover:text-[#202A24] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Profile</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8EBE7]">
                    <div className="flex items-start gap-2.5 pt-2 sm:pt-0">
                      <User className="w-4 h-4 text-[#064E36] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#202A24]">Store Administrator</p>
                        <p className="text-xs text-[#5E6D64] mt-0.5 truncate">{settings.adminName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-3 sm:pt-0 sm:pl-4">
                      <Mail className="w-4 h-4 text-[#064E36] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#202A24]">Notification Email</p>
                        <p className="text-xs text-[#5E6D64] mt-0.5 truncate">{settings.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-3 sm:pt-0 xl:pl-4">
                      <Phone className="w-4 h-4 text-[#064E36] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#202A24]">Contact Number</p>
                        <p className="text-xs text-[#5E6D64] mt-0.5">{settings.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-3 sm:pt-0 sm:pl-4">
                      <MapPin className="w-4 h-4 text-[#064E36] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-[#202A24]">Business Address</p>
                        <p className="text-xs text-[#5E6D64] mt-0.5 leading-snug">{settings.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Middle 2-Column Summary Cards: Inventory & Reordering + Notifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Card A: Inventory & Reordering */}
                <div className="rounded-2xl bg-white border border-[#E8EBE7] p-5 shadow-2xs flex flex-col justify-between space-y-5">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E8EBE7]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] border border-[#C8E8D9] flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5 text-[#064E36]" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm sm:text-base text-[#202A24]">
                          Inventory &amp; Reordering
                        </h3>
                        <p className="text-[11px] text-[#7C877F]">
                          Set stock thresholds and reorder preferences
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubTab('inventory_rules')}
                      aria-label="Open Inventory Rules"
                      className="p-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#5E6D64] hover:text-[#202A24] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 items-center divide-x divide-[#E8EBE7]">
                    <div>
                      <p className="font-display font-black text-2xl text-[#202A24]">
                        {settings.lowStockThreshold}
                      </p>
                      <p className="text-[11px] text-[#7C877F] mt-0.5 leading-tight">
                        Low Stock Threshold
                      </p>
                    </div>

                    <div className="pl-3">
                      <p className="font-display font-black text-2xl text-[#202A24]">
                        {settings.criticalStockThreshold}
                      </p>
                      <p className="text-[11px] text-[#7C877F] mt-0.5 leading-tight">
                        Reorder Batch Qty
                      </p>
                    </div>

                    <div className="pl-3 flex flex-col items-start gap-1.5">
                      <ToggleSwitch
                        checked={settings.autoReorder}
                        onChange={() => handleToggle('autoReorder', 'Auto Reorder Suggestions')}
                        label="Auto Reorder Suggestions"
                      />
                      <span className="text-[11px] text-[#7C877F] leading-tight">
                        Auto Reorder Suggestions
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card B: Notifications */}
                <div className="rounded-2xl bg-white border border-[#E8EBE7] p-5 shadow-2xs flex flex-col justify-between space-y-5">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E8EBE7]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] border border-[#C8E8D9] flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5 text-[#064E36]" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm sm:text-base text-[#202A24]">
                          Notifications
                        </h3>
                        <p className="text-[11px] text-[#7C877F]">
                          Choose what alerts you want to receive
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSubTab('notifications')}
                      aria-label="Open Notifications Settings"
                      className="p-1.5 rounded-lg hover:bg-[#FAF9F5] text-[#5E6D64] hover:text-[#202A24] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 divide-x divide-[#E8EBE7]">
                    <div
                      onClick={() => handleToggle('emailAlerts', 'Email Alerts')}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-center text-[#064E36] group-hover:bg-[#EAF4EC] transition-colors shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#202A24]">Email Alerts</p>
                        <p
                          className={`text-[11px] font-bold flex items-center gap-1 mt-0.5 ${
                            settings.emailAlerts ? 'text-[#064E36]' : 'text-[#7C877F]'
                          }`}
                        >
                          {settings.emailAlerts ? '✓ Enabled' : 'Paused'}
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() =>
                        handleToggle('inAppNotifications', 'In-App Notifications')
                      }
                      className="flex items-center gap-3 pl-4 cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-center text-[#064E36] group-hover:bg-[#EAF4EC] transition-colors shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#202A24]">In-App Notifications</p>
                        <p
                          className={`text-[11px] font-bold flex items-center gap-1 mt-0.5 ${
                            settings.inAppNotifications ? 'text-[#064E36]' : 'text-[#7C877F]'
                          }`}
                        >
                          {settings.inAppNotifications ? '✓ Enabled' : 'Paused'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Security Status Bar */}
              <div className="rounded-2xl bg-[#EAF4EC]/85 border border-[#C8E8D9] p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#064E36] text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#C8E8D9]" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#202A24]">
                      {settings.twoFactorEnabled
                        ? 'Your account is secure'
                        : '2-Factor Authentication is paused'}
                    </p>
                    <p className="text-[11px] text-[#5E6D64]">
                      {settings.twoFactorEnabled
                        ? '2-Factor Authentication is enabled for added protection.'
                        : 'Enable 2-Factor Authentication in Security & Access for stronger protection.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('security')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#C8E8D9] text-xs font-bold text-[#202A24] transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
                >
                  <Lock className="w-3.5 h-3.5 text-[#064E36]" />
                  <span>Manage Security</span>
                </button>
              </div>
            </>
          )}

          {/* ═══════════════════ TAB 2: NOTIFICATIONS ═══════════════════ */}
          {activeSubTab === 'notifications' && (
            <div className="rounded-2xl bg-white border border-[#E8EBE7] p-6 shadow-2xs space-y-5">
              <div className="pb-4 border-b border-[#E8EBE7]">
                <h2 className="font-display font-bold text-lg text-[#202A24]">
                  Notification Channels &amp; Alert Rules
                </h2>
                <p className="text-xs text-[#7C877F] mt-0.5">
                  Configure how stockouts, restock requests, and daily summaries are delivered.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: 'emailAlerts' as const,
                    title: 'Email Out-of-Stock Alerts',
                    desc: `Send immediate alerts to ${settings.email} when a SKU hits 0 units.`,
                  },
                  {
                    key: 'inAppNotifications' as const,
                    title: 'In-App Bell & Dashboard Badges',
                    desc: 'Show live warning badges in the Merchant Topbar and Stock Management center.',
                  },
                  {
                    key: 'dailyDigest' as const,
                    title: 'Daily Multi-Hub Digest',
                    desc: 'Receive a consolidated 9:00 AM summary across Bangalore, Mumbai, and Delhi.',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#202A24]">{item.title}</p>
                      <p className="text-[11px] text-[#7C877F] mt-0.5">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={settings[item.key]}
                      onChange={() => handleToggle(item.key, item.title)}
                      label={item.title}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ TAB 3: SECURITY & ACCESS ═══════════════════ */}
          {activeSubTab === 'security' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-white border border-[#E8EBE7] p-6 shadow-2xs space-y-5">
                <div className="pb-4 border-b border-[#E8EBE7]">
                  <h2 className="font-display font-bold text-lg text-[#202A24]">
                    Security &amp; Access Control
                  </h2>
                  <p className="text-xs text-[#7C877F] mt-0.5">
                    Configure Firewall Two-Factor Authentication (Authenticator App &amp; Email Codes) and session access.
                  </p>
                </div>

                <FirewallTwoStep />

                <div className="p-4 rounded-2xl bg-[#EAF4EC]/60 border border-[#C8E8D9] flex items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-bold text-[#064E36]">Active Merchant Session</p>
                    <p className="text-[#5E6D64] mt-0.5">
                      Signed in as <strong>{settings.adminName}</strong> ({settings.email})
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white border border-[#C8E8D9] text-[11px] font-bold text-[#064E36]">
                    Verified Admin
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════ TAB 4: INVENTORY RULES ═══════════════════ */}
          {activeSubTab === 'inventory_rules' && (
            <div className="rounded-2xl bg-white border border-[#E8EBE7] p-6 shadow-2xs space-y-5">
              <div className="pb-4 border-b border-[#E8EBE7]">
                <h2 className="font-display font-bold text-lg text-[#202A24]">
                  Inventory &amp; Reordering Rules
                </h2>
                <p className="text-xs text-[#7C877F] mt-0.5">
                  Fine-tune stockout thresholds and automated supplier replenishment behavior.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7]">
                  <label className="block text-xs font-bold text-[#202A24] mb-1">
                    Low Stock Threshold (Units)
                  </label>
                  <p className="text-[11px] text-[#7C877F] mb-2.5">
                    SKUs at or below this count trigger low-inventory warnings.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settings.lowStockThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lowStockThreshold: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-28 px-3 py-2 rounded-xl bg-white border border-[#E8EBE7] text-sm font-bold text-[#064E36] outline-none focus:border-[#064E36]"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7]">
                  <label className="block text-xs font-bold text-[#202A24] mb-1">
                    Default Reorder Batch Quantity
                  </label>
                  <p className="text-[11px] text-[#7C877F] mb-2.5">
                    Suggested replenishment unit quantity for restock requests.
                  </p>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={settings.criticalStockThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        criticalStockThreshold: Math.max(5, Number(e.target.value)),
                      })
                    }
                    className="w-28 px-3 py-2 rounded-xl bg-white border border-[#E8EBE7] text-sm font-bold text-[#064E36] outline-none focus:border-[#064E36]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#202A24]">Auto Reorder Suggestions</p>
                    <p className="text-[11px] text-[#7C877F] mt-0.5">
                      Automatically draft supplier restock requests when stock drops below threshold.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.autoReorder}
                    onChange={() => handleToggle('autoReorder', 'Auto Reorder Suggestions')}
                    label="Auto Reorder Suggestions"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-[#202A24]">
                      Automatic Hub Rebalancing Recommendations
                    </p>
                    <p className="text-[11px] text-[#7C877F] mt-0.5">
                      Suggest cross-hub stock transfers when Bangalore, Mumbai, or Delhi runs low.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={settings.autoRebalance}
                    onChange={() =>
                      handleToggle('autoRebalance', 'Hub Rebalancing Recommendations')
                    }
                    label="Hub Rebalancing"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => notifySaved('Inventory rules updated.')}
                  className="px-5 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Rules</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════ TAB 5: MULTI-HUB SETTINGS ═══════════════════ */}
          {activeSubTab === 'hubs' && (
            <div className="rounded-2xl bg-white border border-[#E8EBE7] p-6 shadow-2xs space-y-5">
              <div className="pb-4 border-b border-[#E8EBE7]">
                <h2 className="font-display font-bold text-lg text-[#202A24]">
                  Multi-Hub Fulfillment Network
                </h2>
                <p className="text-xs text-[#7C877F] mt-0.5">
                  Enable or pause regional city fulfillment depots across India.
                </p>
              </div>

              <div className="space-y-3">
                {(
                  [
                    {
                      city: 'Bangalore' as const,
                      hub: 'Bangalore Primary Hub — Indiranagar (560038)',
                      count: products.filter((p) => p.location === 'Bangalore' || p.location === 'Bengaluru').length,
                    },
                    {
                      city: 'Mumbai' as const,
                      hub: 'Mumbai Central Logistics — Bandra Depot (400050)',
                      count: products.filter((p) => p.location === 'Mumbai').length,
                    },
                    {
                      city: 'Delhi' as const,
                      hub: 'Delhi NCR Hub — Connaught Place (110001)',
                      count: products.filter((p) => p.location === 'Delhi').length,
                    },
                  ]
                ).map((h) => (
                  <div
                    key={h.city}
                    className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#064E36] flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#202A24]">{h.hub}</p>
                        <p className="text-[11px] text-[#7C877F] mt-0.5">
                          {h.count} assigned SKUs
                        </p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={settings.enabledHubs[h.city]}
                      onChange={() => {
                        setSettings((prev) => ({
                          ...prev,
                          enabledHubs: {
                            ...prev.enabledHubs,
                            [h.city]: !prev.enabledHubs[h.city],
                          },
                        }));
                        notifySaved(`${h.city} hub status updated.`);
                      }}
                      label={`Toggle ${h.city} Hub`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════ TAB 6: REPORTS & DATA ═══════════════════ */}
          {activeSubTab === 'reports' && (
            <div className="rounded-2xl bg-white border border-[#E8EBE7] p-6 shadow-2xs space-y-5">
              <div className="pb-4 border-b border-[#E8EBE7]">
                <h2 className="font-display font-bold text-lg text-[#202A24]">
                  Reports &amp; Catalog Data
                </h2>
                <p className="text-xs text-[#7C877F] mt-0.5">
                  Export active inventory snapshots or restore default merchant settings.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] space-y-3">
                  <p className="text-xs font-bold text-[#202A24]">Export Inventory Snapshot</p>
                  <p className="text-[11px] text-[#7C877F]">
                    Download all {products.length} active SKUs, categories, pricing, and hub allocations as a CSV spreadsheet.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportCatalogCSV}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV ({products.length} SKUs)</span>
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] space-y-3">
                  <p className="text-xs font-bold text-[#202A24]">Reset Store Preferences</p>
                  <p className="text-[11px] text-[#7C877F]">
                    Restore threshold rules, contact details, and notification toggles back to factory defaults.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSettings(defaultSettings);
                      notifySaved('Merchant settings reset to defaults.');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-red-50 border border-[#E8EBE7] hover:border-red-200 text-xs font-bold text-[#202A24] hover:text-red-600 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Preferences</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
