import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowUpRight, MapPin, Sparkles, User, LogOut, LayoutDashboard, Boxes } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './common/BrandLogo';

interface NavbarProps {
  onOpenDemo?: () => void;
  onOpenMerchantDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDemo, onOpenMerchantDashboard }) => {
  const [scrolled, setScrolled] = useState(false);
  const [selectedCity, setSelectedCity] = useState('New York');
  const { user, profile, openAuthModal, openDashboard, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cities = ['New York', 'San Francisco', 'Chicago', 'London'];

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled 
        ? 'py-3 bg-[#F8F8F3]/85 backdrop-blur-md border-b border-[#101413]/5 shadow-sm' 
        : 'py-5 bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo matching Reference 2 */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] border border-[#C8E8D9] p-1 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
            <BrandLogo className="w-full h-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-[#0A2540] leading-none">
              Celerity<span className="font-normal text-[#65B99B] ml-1">Commerce</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-[#101413]/50 mt-0.5">
              Smart Basket Rescue
            </span>
          </div>
        </a>

        {/* Center Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-[#101413]/70">
          <a href="#problem" className="hover:text-[#0A2540] transition-colors py-1">Problem</a>
          <a href="#smart-basket-demo" className="hover:text-[#0A2540] transition-colors py-1 flex items-center gap-1 text-[#4E9A7F]">
            <Sparkles className="w-3.5 h-3.5 text-[#65B99B]" />
            Interactive Demo
          </a>
          <a href="#workflow" className="hover:text-[#0A2540] transition-colors py-1">How It Works</a>
          <a href="#showcase" className="hover:text-[#0A2540] transition-colors py-1">Showcase</a>
          <a href="#comparison" className="hover:text-[#0A2540] transition-colors py-1">Impact</a>
        </nav>

        {/* Right Actions & Multi-City Switcher & Auth */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* City Hub Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-[#101413]/10 text-xs font-medium text-[#101413]/80">
            <MapPin className="w-3.5 h-3.5 text-[#65B99B]" />
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-xs font-semibold text-[#0A2540]"
              aria-label="Fulfillment Hub Location"
            >
              {cities.map(c => (
                <option key={c} value={c}>{c} Hub</option>
              ))}
            </select>
            <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B] animate-pulse"></span>
          </div>

          {/* User Auth Buttons / Profile Indicator */}
          {user ? (
            <div className="flex items-center gap-2">
              {onOpenMerchantDashboard && (
                <button
                  type="button"
                  onClick={onOpenMerchantDashboard}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#DCEFE3] hover:bg-[#C8E8D9] border border-[#064E36]/20 text-xs font-bold text-[#064E36] transition-all cursor-pointer shadow-xs"
                >
                  <Boxes className="w-3.5 h-3.5 text-[#064E36]" />
                  <span className="hidden sm:inline">Merchant Admin</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              )}
              <button
                onClick={openDashboard}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#101413]/10 text-xs font-bold text-[#0A2540] hover:border-[#65B99B] transition-all cursor-pointer shadow-xs"
              >
                <div className="w-5 h-5 rounded-full bg-[#65B99B] text-white flex items-center justify-center text-[10px]">
                  {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline max-w-[100px] truncate">
                  {profile?.full_name || 'Dashboard'}
                </span>
                <LayoutDashboard className="w-3.5 h-3.5 text-[#65B99B]" />
              </button>
              <button
                onClick={signOut}
                title="Sign out of Celerity Commerce"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-red-50 text-xs font-semibold text-[#101413]/70 hover:text-red-600 border border-[#101413]/10 hover:border-red-200 transition-all cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#0A2540] hover:bg-white/80 transition-all cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full bg-white border border-[#101413]/10 hover:border-[#65B99B] text-xs font-bold text-[#0A2540] transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}

          {/* Launch Demo CTA */}
          <a
            href="#smart-basket-demo"
            onClick={onOpenDemo}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0A2540] hover:bg-[#101413] text-white text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm hover:shadow group"
          >
            <span>Live Rescue</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
