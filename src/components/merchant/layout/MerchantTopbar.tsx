import React, { useState } from 'react';
import {
  Search,
  Bell,
  MapPin,
  ChevronDown,
  Menu,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { MerchantTab, StoreLocation } from '../../../types/product';

interface MerchantTopbarProps {
  currentTab: MerchantTab;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLocation: StoreLocation;
  onSelectLocation: (loc: StoreLocation) => void;
  onOpenMobileSidebar: () => void;
  onExitToStorefront: () => void;
  onSignOut: () => void;
  lowStockCount: number;
  outOfStockCount: number;
  merchantName?: string;
  merchantEmail?: string;
}

export const MerchantTopbar: React.FC<MerchantTopbarProps> = ({
  currentTab,
  searchQuery,
  onSearchChange,
  selectedLocation,
  onSelectLocation,
  onOpenMobileSidebar,
  onExitToStorefront,
  onSignOut,
  lowStockCount,
  outOfStockCount,
  merchantName = 'Aryan Singh',
  merchantEmail = 'aryansingh787769@gmail.com',
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const tabTitles: Record<MerchantTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Overview',
      subtitle: 'Real-time store metrics, fulfillment hubs & inventory volume',
    },
    inventory: {
      title: 'Inventory Management',
      subtitle: 'Full SKU telemetry, live stock levels & multi-hub fulfillment',
    },
    products: {
      title: 'Product Catalog',
      subtitle: 'Visual merchandise grid inspired by clean e-commerce presentation',
    },
    categories: {
      title: 'Categories',
      subtitle: 'Stock allocation, product counts & category inventory valuation',
    },
    stock: {
      title: 'Stock Management',
      subtitle: 'Reorder alerts, threshold triggers & automated stock rescue',
    },
    locations: {
      title: 'Store Locations',
      subtitle: 'Bangalore, Mumbai & Delhi multi-hub distribution centers',
    },
    settings: {
      title: 'Merchant Settings',
      subtitle: 'Store configuration, alert thresholds & administrative profile',
    },
  };

  const locations: StoreLocation[] = [
    'All Locations',
    'Bangalore',
    'Mumbai',
    'Delhi',
  ];

  const totalAlerts = lowStockCount + outOfStockCount;

  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8EBE7] px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title / Breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="p-2 rounded-xl border border-[#E8EBE7] bg-white text-[#202A24] lg:hidden hover:bg-[#EAF4EC] transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7C877F]">
            <span>Celerity</span>
            <span>/</span>
            <span className="text-[#064E36] font-bold capitalize">
              {tabTitles[currentTab].title}
            </span>
          </div>
          <h1 className="font-display font-black text-lg sm:text-xl text-[#202A24] tracking-tight truncate">
            {tabTitles[currentTab].title}
          </h1>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C877F]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products, SKUs, or categories..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#E8EBE7] focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-xs font-medium text-[#202A24] placeholder-[#7C877F] transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7C877F] hover:text-[#202A24]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Location Selector, Notifications, Storefront Switcher & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Store Location Selector */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E8EBE7] text-xs font-semibold text-[#202A24] shadow-2xs">
          <MapPin className="w-3.5 h-3.5 text-[#064E36]" />
          <select
            value={selectedLocation}
            onChange={(e) => onSelectLocation(e.target.value as StoreLocation)}
            className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-bold text-[#064E36]"
            aria-label="Fulfillment Hub Location Filter"
          >
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc === 'All Locations' ? 'All Hubs (Multi-City)' : `${loc} Hub`}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Icon with Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            aria-label="Notifications"
            className="relative p-2 rounded-xl bg-white border border-[#E8EBE7] text-[#202A24] hover:bg-[#EAF4EC] hover:text-[#064E36] transition-colors cursor-pointer shadow-2xs"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E5B842] text-[#103C2D] font-extrabold text-[9px] flex items-center justify-center border-2 border-white">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-[#E8EBE7] shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EBE7]">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#202A24]">
                  Inventory Alerts ({totalAlerts})
                </h3>
                <span className="text-[10px] text-[#064E36] font-bold">Auto-synced</span>
              </div>
              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                {outOfStockCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{outOfStockCount} Product(s) Out of Stock</p>
                      <p className="text-[11px] text-red-700 mt-0.5">
                        Wireless Earbuds (AUD-004) reached zero inventory in Delhi Hub.
                      </p>
                    </div>
                  </div>
                )}
                {lowStockCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#F5EBCB]/40 border border-[#E8D58A] text-xs text-[#103C2D] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#E5B842] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{lowStockCount} Products Low in Stock</p>
                      <p className="text-[11px] text-[#7C877F] mt-0.5">
                        Noise Cancelling Headphones & Business Laptop under 10 units.
                      </p>
                    </div>
                  </div>
                )}
                {totalAlerts === 0 && (
                  <div className="py-4 text-center text-xs text-[#7C877F]">
                    <CheckCircle2 className="w-6 h-6 text-[#064E36] mx-auto mb-1" />
                    All inventory levels are optimal.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Portal Switcher: View Customer Storefront */}
        <button
          type="button"
          onClick={onExitToStorefront}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DCEFE3] hover:bg-[#C8E8D9] text-[#064E36] font-display text-xs font-bold transition-all cursor-pointer shadow-2xs border border-[#064E36]/10"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Customer View</span>
        </button>

        {/* Merchant Avatar & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white border border-[#E8EBE7] hover:border-[#064E36] transition-colors cursor-pointer shadow-2xs"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#064E36] to-[#103C2D] text-white flex items-center justify-center font-bold text-xs">
              {merchantName.charAt(0)}
            </div>
            <span className="hidden md:inline font-display text-xs font-bold text-[#202A24] max-w-[90px] truncate">
              {merchantName}
            </span>
            <ChevronDown className="w-3 h-3 text-[#7C877F]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E8EBE7] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-[#E8EBE7] mb-1">
                <p className="text-xs font-bold text-[#202A24] truncate">{merchantName}</p>
                <p className="text-[10px] text-[#7C877F] truncate">{merchantEmail}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded-xs bg-[#DCEFE3] text-[#064E36] text-[9px] font-extrabold uppercase">
                  Verified Store Admin
                </span>
              </div>
              <button
                type="button"
                onClick={onExitToStorefront}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#202A24] hover:bg-[#EAF4EC] hover:text-[#064E36] transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#7C877F]" />
                <span>Visit Customer Storefront</span>
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
