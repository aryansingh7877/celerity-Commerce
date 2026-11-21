import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Package,
  Layers,
  AlertTriangle,
  MapPin,
  Settings,
  HelpCircle,
  LogOut,
  ShoppingBag,
  ShieldCheck,
  ClipboardList,
  Truck,
  Archive,
} from 'lucide-react';
import { MerchantTab } from '../../../types/product';

interface MerchantSidebarProps {
  currentTab: MerchantTab;
  onSelectTab: (tab: MerchantTab) => void;
  onSignOut: () => void;
  merchantName?: string;
  merchantEmail?: string;
  lowStockCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  currentTab,
  onSelectTab,
  onSignOut,
  merchantName = 'Aryan Singh',
  merchantEmail = 'aryansingh787769@gmail.com',
  lowStockCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'overview' as MerchantTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'inventory' as MerchantTab,
      label: 'Inventory',
      icon: Boxes,
      badge: null,
    },
    {
      id: 'products' as MerchantTab,
      label: 'Products',
      icon: Package,
      badge: null,
    },
    {
      id: 'categories' as MerchantTab,
      label: 'Categories',
      icon: Layers,
      badge: null,
    },
    {
      id: 'stock' as MerchantTab,
      label: 'Stock Management',
      icon: AlertTriangle,
      badge: lowStockCount > 0 ? `${lowStockCount}` : null,
      badgeAlert: true,
    },
    {
      id: 'locations' as MerchantTab,
      label: 'Store Locations',
      icon: MapPin,
      badge: '3 Hubs',
    },
    {
      id: 'orders' as MerchantTab,
      label: 'Orders',
      icon: ClipboardList,
      badge: null,
    },
    {
      id: 'deadstock' as MerchantTab,
      label: 'Dead Stock',
      icon: Archive,
      badge: null,
    },
    {
      id: 'suppliers' as MerchantTab,
      label: 'Suppliers',
      icon: Truck,
      badge: null,
    },
    {
      id: 'settings' as MerchantTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-[#101413]/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#FAF9F5] border-r border-[#E8EBE7] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-6 border-b border-[#E8EBE7] bg-white/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Brand Logo with Speed Trails */}
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#65B99B] via-[#C8E8D9] to-[#E8D58A] flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5 text-[#064E36] stroke-[2.2]" />
                <span className="absolute -left-1.5 top-2.5 w-2 h-0.5 bg-[#064E36] rounded-full opacity-60"></span>
                <span className="absolute -left-2.5 top-4.5 w-3.5 h-0.5 bg-[#064E36] rounded-full opacity-80"></span>
                <span className="absolute -left-1.5 top-6.5 w-2 h-0.5 bg-[#064E36] rounded-full opacity-60"></span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-lg tracking-tight text-[#0A2540] leading-tight">
                  Celerity<span className="font-medium text-[#064E36] ml-1">Commerce</span>
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-[#DCEFE3] text-[#064E36] text-[9px] font-extrabold uppercase tracking-wider">
                    Merchant Admin
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10A37F] animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Navigation Menu */}
        <div className="flex-1 px-4 py-5 overflow-y-auto space-y-1 selection:bg-[#DCEFE3]">
          <div className="px-3 mb-2 text-[11px] font-extrabold uppercase tracking-widest text-[#7C877F]">
            Inventory & Store
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-display text-sm font-semibold transition-all duration-150 cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#DCEFE3] text-[#064E36] shadow-xs'
                      : 'text-[#202A24]/75 hover:bg-[#EAF4EC]/80 hover:text-[#064E36]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-[#064E36] stroke-[2.2]' : 'text-[#7C877F]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        item.badgeAlert
                          ? 'bg-[#F5EBCB] text-[#103C2D] border border-[#E8D58A]'
                          : 'bg-white/80 text-[#7C877F] border border-[#E8EBE7]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

        </div>

        {/* Bottom: Profile & Logout */}
        <div className="p-4 border-t border-[#E8EBE7] bg-white/60 space-y-3">
          {/* Support Link */}
          <button
            type="button"
            onClick={() => onSelectTab('settings')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#7C877F] hover:text-[#064E36] hover:bg-[#EAF4EC]/60 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Merchant Support</span>
          </button>

          {/* Merchant Profile Info */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#064E36] to-[#103C2D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {merchantName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#202A24] truncate">
                  {merchantName}
                </p>
                <p className="text-[10px] text-[#7C877F] truncate">
                  {merchantEmail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#7C877F] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
