import React, { useState } from 'react';
import {
  Search,
  Bell,
  MapPin,
  ChevronDown,
  Menu,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  X,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { MerchantTab, Product, StoreLocation } from '../../../types/product';

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
  alertProducts?: Product[];
  onInformSupplier?: (product: Product) => void;
  onTakeAction?: (product: Product) => void;
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
  alertProducts = [],
  onInformSupplier,
  onTakeAction,
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
    orders: {
      title: 'Orders',
      subtitle: 'PostgreSQL transactional orders and fulfillment tracking',
    },
    deadstock: {
      title: 'Dead Stock Analytics',
      subtitle: 'Identify idle/overstocked SKUs, AI recommendations & liquidation offers',
    },
    suppliers: {
      title: 'Suppliers',
      subtitle: 'Manage distributor WhatsApp contacts for automated stockout alerts',
    },
    restock: {
      title: 'Restock Requests',
      subtitle: 'Automated restock requests triggered by low-stock Kafka consumers',
    },
    notifications: {
      title: 'Supplier Notification Logs',
      subtitle: 'Audit WhatsApp replenishment dispatches and retries',
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

  const totalAlerts = alertProducts.length || lowStockCount + outOfStockCount;

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

        {/* Notifications Icon with Live Low-Stock CTA Dropdown */}
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
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#E5B842] text-[#103C2D] font-extrabold text-[9px] flex items-center justify-center border-2 border-white">
                {totalAlerts}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 rounded-2xl bg-white border border-[#E8EBE7] shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8EBE7]">
                <div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#202A24]">
                    Stock Replenishment Alerts ({totalAlerts})
                  </h3>
                  <p className="text-[10px] text-[#7C877F]">
                    SKUs running low or out of stock across regional hubs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="p-1 rounded-lg text-[#7C877F] hover:text-[#202A24] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-2.5 space-y-2.5 max-h-80 overflow-y-auto">
                {alertProducts.length > 0 ? (
                  alertProducts.map((item) => {
                    const isOut = item.stock === 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-xs space-y-2.5 ${
                          isOut
                            ? 'bg-red-50/70 border-red-200 text-red-950'
                            : 'bg-[#FFFBEB] border-[#E8D58A] text-[#103C2D]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isOut ? 'text-red-600' : 'text-[#D97706]'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold truncate">{item.name}</p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                                  isOut
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-[#F5EBCB] text-[#7A5800]'
                                }`}
                              >
                                {isOut ? 'Out of Stock (0)' : `Only ${item.stock} left`}
                              </span>
                            </div>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              SKU: <span className="font-mono font-bold">{item.sku}</span> ·{' '}
                              {item.location} Hub is about to run out of stock.
                            </p>
                          </div>
                        </div>

                        {/* Call-To-Action Buttons: Inform Supplier & Take Action */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-black/5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotifications(false);
                              onTakeAction?.(item);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF9F5] border border-[#E8EBE7] text-[11px] font-extrabold text-[#202A24] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Take Action</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNotifications(false);
                              onInformSupplier?.(item);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#064E36] hover:bg-[#103C2D] text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <MessageSquare className="w-3 h-3 text-[#C8E8D9]" />
                            <span>Inform Supplier</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-[#7C877F]">
                    <CheckCircle2 className="w-7 h-7 text-[#064E36] mx-auto mb-1.5" />
                    <p className="font-bold text-[#202A24]">All inventory levels are optimal</p>
                    <p className="text-[11px] mt-0.5">
                      No products are currently running low on stock.
                    </p>
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
