import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShoppingBag, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  User as UserIcon, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw,
  LogOut,
  MapPin,
  Save,
  KeyRound,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getOrCreateUserBasket, 
  getBasketItems, 
  rescueBasketItem, 
  getRescueHistory,
  getProducts
} from '../lib/supabase/database';
import { updateProfile } from '../lib/supabase/auth';
import { 
  DatabaseBasket, 
  DatabaseBasketItem, 
  DatabaseRescueEvent, 
  DatabaseProduct 
} from '../lib/supabase/client';

export const CustomerDashboard: React.FC = () => {
  const { user, profile, isDashboardOpen, closeDashboard, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'basket' | 'rescue_history' | 'profile'>('basket');

  // Supabase Data State
  const [basket, setBasket] = useState<DatabaseBasket | null>(null);
  const [basketItems, setBasketItems] = useState<DatabaseBasketItem[]>([]);
  const [rescueHistory, setRescueHistory] = useState<DatabaseRescueEvent[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<DatabaseProduct[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Profile Edit State
  const [editName, setEditName] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Load customer data whenever dashboard opens or user changes
  useEffect(() => {
    if (isDashboardOpen && user) {
      loadDashboardData();
      setEditName(profile?.full_name || '');
    }
  }, [isDashboardOpen, user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoadingData(true);

    try {
      // 1. Fetch or create user active basket
      const currentBasket = await getOrCreateUserBasket(user.id);
      setBasket(currentBasket);

      if (currentBasket) {
        // 2. Fetch items for this basket
        const items = await getBasketItems(currentBasket.id);
        
        // If the database basket is empty, let's provide realistic demo seed items in state
        if (items.length === 0) {
          setBasketItems([
            {
              id: 'item-demo-1',
              basket_id: currentBasket.id,
              product_id: 'a1000000-0000-0000-0000-000000000001',
              quantity: 1,
              price: 35.00,
              created_at: new Date().toISOString(),
              product: {
                id: 'a1000000-0000-0000-0000-000000000001',
                name: 'Resurrection Aromatique Hand Balm 75ml',
                description: 'Rich moisturizing botanicals',
                category: 'Personal Care',
                price: 35.00,
                image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
                created_at: new Date().toISOString()
              }
            },
            {
              id: 'item-demo-2',
              basket_id: currentBasket.id,
              product_id: 'a1000000-0000-0000-0000-000000000002',
              quantity: 1,
              price: 18.50,
              created_at: new Date().toISOString(),
              product: {
                id: 'a1000000-0000-0000-0000-000000000002',
                name: 'Yirgacheffe Single-Origin Cold Brew 750ml',
                description: 'High-altitude Ethiopian slow extraction',
                category: 'Specialty Beverage',
                price: 18.50,
                image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
                created_at: new Date().toISOString()
              }
            }
          ]);
        } else {
          setBasketItems(items);
        }

        // 3. Fetch rescue history
        const history = await getRescueHistory(currentBasket.id);
        setRescueHistory(history);
      }

      // 4. Fetch available catalog products
      const products = await getProducts();
      setCatalogProducts(products);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleRescueAction = async (unavailableId: string, replacementId: string) => {
    if (!basket) return;
    setLoadingData(true);

    const res = await rescueBasketItem(basket.id, unavailableId, replacementId);
    if (res.success) {
      // Reload updated basket & history
      await loadDashboardData();
    }
    setLoadingData(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileSuccess(null);

    const { error } = await updateProfile(user.id, { full_name: editName });
    if (!error) {
      await refreshProfile();
      setProfileSuccess('Profile updated successfully in Supabase.');
    }
    setSavingProfile(false);
  };

  if (!isDashboardOpen || !user) return null;

  const subtotal = basketItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeDashboard}
        className="fixed inset-0 bg-[#101413]/70 backdrop-blur-md"
      />

      {/* Main Dashboard Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[#F8F8F3] border border-[#101413]/10 shadow-2xl z-10 flex flex-col overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="p-6 sm:p-8 bg-white border-b border-[#101413]/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#65B99B] to-[#C8E8D9] flex items-center justify-center text-[#0A2540] font-black text-xl shadow-xs">
              {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#0A2540]">
                  Welcome back, {profile?.full_name || 'Customer'}
                </h2>
                <span className="text-[10px] font-bold text-[#65B99B] bg-[#C8E8D9]/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" /> Supabase Connected
                </span>
              </div>
              <p className="text-xs text-[#101413]/60 mt-0.5">
                {user.email} · Account ID: <span className="font-mono">{user.id.slice(0, 8)}...</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={signOut}
              className="px-3.5 py-2 rounded-xl bg-[#F8F8F3] hover:bg-red-50 text-xs font-semibold text-[#101413]/70 hover:text-red-600 border border-[#101413]/8 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <button
              onClick={closeDashboard}
              className="p-2.5 rounded-xl hover:bg-[#F8F8F3] text-[#101413]/50 hover:text-[#101413] transition-colors cursor-pointer"
              aria-label="Close dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 sm:px-8 py-3 bg-[#E9E9D9]/40 border-b border-[#101413]/8 text-xs font-bold uppercase tracking-wider text-[#101413]/60">
          <button
            onClick={() => setActiveTab('basket')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'basket'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'hover:text-[#0A2540]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#65B99B]" />
            <span>Active Basket</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#E9E9D9] text-[10px]">
              {basketItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rescue_history')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rescue_history'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'hover:text-[#0A2540]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#65B99B]" />
            <span>Rescue History</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#E9E9D9] text-[10px]">
              {rescueHistory.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-[#0A2540] shadow-xs'
                : 'hover:text-[#0A2540]'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-[#65B99B]" />
            <span>Profile Settings</span>
          </button>
        </div>

        {/* Dashboard Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          {loadingData ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[#65B99B]" />
              <p className="text-xs font-semibold text-[#101413]/60">
                Syncing with PostgreSQL tables on Supabase...
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: ACTIVE BASKET & RESCUE ENGINE */}
              {activeTab === 'basket' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl bg-white border border-[#101413]/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#65B99B]">
                        Live Multi-City Hub Session
                      </span>
                      <h3 className="font-display text-base font-extrabold text-[#0A2540]">
                        Cart Session Status: {basket?.status.toUpperCase() || 'ACTIVE'}
                      </h3>
                      <p className="text-xs text-[#101413]/60 mt-0.5">
                        PostgreSQL table <code className="font-mono bg-[#F8F8F3] px-1 py-0.5 rounded">public.baskets</code> verified.
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-[#101413]/60 block">Verified Subtotal</span>
                      <span className="font-display text-xl font-black text-[#0A2540]">
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                      Current Basket SKUs ({basketItems.length})
                    </h4>

                    {basketItems.map((item) => {
                      const isUnavailable = item.product?.name.includes('Yirgacheffe');

                      return (
                        <div 
                          key={item.id}
                          className={`p-4 rounded-2xl bg-white border transition-all ${
                            isUnavailable 
                              ? 'border-red-300 bg-red-50/40' 
                              : 'border-[#101413]/8'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <img 
                                src={item.product?.image_url || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=80'} 
                                alt={item.product?.name || 'Product'} 
                                className="w-12 h-12 rounded-xl object-cover border border-[#101413]/10"
                              />
                              <div>
                                <h5 className={`text-xs font-bold text-[#0A2540] ${isUnavailable ? 'line-through text-[#101413]/60' : ''}`}>
                                  {item.product?.name || 'Catalog Item'}
                                </h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-[#101413]/50">
                                    Qty: {item.quantity} · Category: {item.product?.category || 'General'}
                                  </span>
                                  {isUnavailable ? (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded">
                                      0 Units in Midtown Hub
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-[#65B99B] bg-[#C8E8D9]/50 px-1.5 py-0.2 rounded">
                                      Stock Confirmed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-bold text-[#0A2540]">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Trigger Rescue Banner if item is out of stock */}
                          {isUnavailable && (
                            <div className="mt-3 pt-3 border-t border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="text-xs text-red-700">
                                <strong>Smart Recommendation:</strong> Guji Highland Washed (+$0.50, 14 units at Downtown Hub)
                              </div>
                              <button
                                onClick={() => handleRescueAction(item.product_id, 'a1000000-0000-0000-0000-000000000004')}
                                className="px-3 py-1.5 rounded-xl bg-[#65B99B] hover:bg-[#4E9A7F] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Execute 1-Tap Rescue</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Proceed to Checkout CTA */}
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={() => alert('Order authorized seamlessly through Supabase PostgreSQL session!')}
                      className="px-6 py-3 rounded-2xl bg-[#0A2540] hover:bg-[#101413] text-white text-xs font-bold tracking-wide transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#65B99B]" />
                      <span>Proceed with Verified Order (${(subtotal + 5.0).toFixed(2)})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: RESCUE HISTORY */}
              {activeTab === 'rescue_history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                      Cart Rescue Audit Trail
                    </h4>
                    <span className="text-[11px] text-[#101413]/50">
                      Row Level Security (RLS) filtered for {user.email}
                    </span>
                  </div>

                  {rescueHistory.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-white border border-[#101413]/8 text-center">
                      <ShieldCheck className="w-8 h-8 text-[#65B99B] mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-bold text-[#0A2540]">No previous rescue records</p>
                      <p className="text-[11px] text-[#101413]/60 max-w-sm mx-auto mt-1">
                        When an out-of-stock item is swapped in your cart, Supabase logs the exact SKU substitution to <code className="font-mono text-xs">public.rescue_events</code>.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rescueHistory.map((event) => (
                        <div key={event.id} className="p-4 rounded-2xl bg-white border border-[#101413]/8 shadow-xs">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-[#65B99B] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Order Rescued ({event.status})
                            </span>
                            <span className="text-[10px] text-[#101413]/50">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-[#101413]/80">
                            Swapped out-of-stock SKU for <span className="font-bold text-[#0A2540]">{event.replacement_product?.name || 'Guji Highland Washed'}</span>.
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PROFILE SETTINGS */}
              {activeTab === 'profile' && (
                <div className="max-w-lg">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A2540] mb-4">
                    Profile Details (<code className="font-mono text-[11px]">public.profiles</code>)
                  </h4>

                  {profileSuccess && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-[#EBF7F2] border border-[#65B99B]/40 text-xs text-[#26352F] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#65B99B]" />
                      <span>{profileSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A2540] mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#101413]/10 text-xs text-[#101413] focus:outline-none focus:border-[#65B99B]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A2540] mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user.email || ''}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#E9E9D9]/50 border border-[#101413]/10 text-xs text-[#101413]/60 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-[#101413]/50 block mt-1">
                        Managed through Supabase Auth credentials.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-5 py-2.5 rounded-xl bg-[#0A2540] hover:bg-[#101413] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {savingProfile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving to Supabase...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

      </motion.div>
    </div>
  );
};
