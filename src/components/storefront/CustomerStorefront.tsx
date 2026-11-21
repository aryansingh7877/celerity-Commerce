import React, { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  MapPin,
  Sparkles,
  LayoutDashboard,
  LogOut,
  Package,
  CheckCircle2,
  Star,
  Heart,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Activity,
  RotateCcw,
  X,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { CATALOG_UPDATED_EVENT } from '../../lib/merchantInventoryStore';
import {
  CityName,
  CITIES,
  MultiCityProduct,
  getSavedCity,
  saveSelectedCity,
  getUnifiedStorefrontCatalog,
  resolveTypoCorrection,
  matchesTypoTolerantSearch,
  recordPipelineEvent,
  clearStockOverrides,
} from '../../lib/storefrontCatalog';
import { CartDrawer } from './CartDrawer';
import { ProductDetailView, getStockBadgeMeta } from './ProductDetailView';
import {
  CheckoutAndRescueView,
  CartItemLine,
  ConfirmedOrderRecord,
} from './CheckoutAndRescueView';
import { PipelineStatusView } from './PipelineStatusView';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

const CART_STORAGE_KEY = 'celerity_multi_city_cart_v2';

type StorefrontScreen =
  | 'home'
  | 'product_detail'
  | 'checkout'
  | 'rescue'
  | 'confirmed'
  | 'pipeline_status';

interface ToastMessage {
  id: string;
  title: string;
  subtitle?: string;
  tone: 'success' | 'city' | 'rescue';
}

interface CustomerStorefrontProps {
  onOpenMerchant: () => void;
}

function loadPersistedCart(catalog: MultiCityProduct[]): CartItemLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: { productId?: string; product?: MultiCityProduct; quantity?: number }) => {
        const id = item.productId || item.product?.id;
        const found = catalog.find((p) => p.id === id) || item.product;
        if (!found) return null;
        return {
          product: found,
          quantity: Math.max(1, Number(item.quantity) || 1),
        };
      })
      .filter(Boolean) as CartItemLine[];
  } catch {
    return [];
  }
}

function savePersistedCart(lines: CartItemLine[]) {
  if (typeof window === 'undefined') return;
  try {
    const compact = lines.map((l) => ({
      productId: l.product.id,
      product: l.product,
      quantity: l.quantity,
    }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    /* ignore */
  }
}

export const CustomerStorefront: React.FC<CustomerStorefrontProps> = ({
  onOpenMerchant,
}) => {
  const { profile, user, signOut } = useAuth();

  // Core multi-city catalog & persisted city selection
  const [catalog, setCatalog] = useState<MultiCityProduct[]>(() =>
    getUnifiedStorefrontCatalog()
  );
  const [city, setCity] = useState<CityName>(() => getSavedCity());
  const [screen, setScreen] = useState<StorefrontScreen>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Cart state persisted per demo session
  const [cart, setCart] = useState<CartItemLine[]>(() =>
    loadPersistedCart(getUnifiedStorefrontCatalog())
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [simulateConflict, setSimulateConflict] = useState(false);
  const [confirmedOrder, setConfirmedOrder] =
    useState<ConfirmedOrderRecord | null>(null);

  // Search with 220ms debounce & typo tolerance
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filters, Sorting & Pagination
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [priceFilter, setPriceFilter] = useState<
    'all' | 'under25k' | '25kTo60k' | 'above60k'
  >('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'featured' | 'price_asc' | 'price_desc' | 'rating'
  >('featured');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 8;

  // Polish: Loading skeletons & Toasts & Wishlist hearts
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const catalogSectionRef = useRef<HTMLDivElement>(null);

  const pushToast = (
    title: string,
    subtitle?: string,
    tone: ToastMessage['tone'] = 'success'
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-2), { id, title, subtitle, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  };

  // Sync catalog when merchant admin uploads an Excel sheet
  const refreshCatalogFromStore = () => {
    const fresh = getUnifiedStorefrontCatalog();
    setCatalog(fresh);
    setCart((prev) =>
      prev
        .map((line) => {
          const updated = fresh.find((p) => p.id === line.product.id);
          return updated ? { ...line, product: updated } : line;
        })
        .filter(Boolean)
    );
  };

  useEffect(() => {
    window.addEventListener(CATALOG_UPDATED_EVENT, refreshCatalogFromStore);
    window.addEventListener('storage', refreshCatalogFromStore);
    return () => {
      window.removeEventListener(CATALOG_UPDATED_EVENT, refreshCatalogFromStore);
      window.removeEventListener('storage', refreshCatalogFromStore);
    };
  }, []);

  useEffect(() => {
    savePersistedCart(cart);
  }, [cart]);

  // Debounce search query (220ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setCurrentPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  // Close search suggestion dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle City Change with persistence, skeleton refresh, pipeline log, and toast
  const handleSelectCity = (nextCity: CityName) => {
    if (nextCity === city) return;
    setCity(nextCity);
    saveSelectedCity(nextCity);
    setIsLoadingSkeleton(true);
    recordPipelineEvent({
      service: 'OpenSearch',
      topic: 'storefront.city.switch',
      city: nextCity,
      summary: `Switched active fulfillment hub to ${nextCity} — refreshed live stock badges across catalog`,
      status: 'INDEXED',
    });
    const hub = CITIES.find((c) => c.name === nextCity);
    pushToast(
      `Switched to ${nextCity} Hub`,
      `Availability refreshed · ${hub?.sla || 'Same-day dispatch'}`,
      'city'
    );
    setTimeout(() => {
      setIsLoadingSkeleton(false);
    }, 240);
  };

  // Categories list
  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(catalog.map((p) => p.category).filter(Boolean))
    );
    return ['All', ...unique];
  }, [catalog]);

  // Typo correction detection (e.g. "lapto" -> "laptop")
  const typoCorrection = useMemo(
    () => resolveTypoCorrection(debouncedSearch),
    [debouncedSearch]
  );

  // Debounced search dropdown suggestions (top 5 matches)
  const searchSuggestions = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    return catalog
      .map((p) => ({
        product: p,
        ...matchesTypoTolerantSearch(p, debouncedSearch),
      }))
      .filter((item) => item.matches)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.product);
  }, [catalog, debouncedSearch]);

  // Filtered & sorted catalog for main grid
  const filteredProducts = useMemo(() => {
    return catalog
      .map((product) => {
        const searchResult = matchesTypoTolerantSearch(product, debouncedSearch);
        return { product, ...searchResult };
      })
      .filter(({ product, matches }) => {
        if (debouncedSearch.trim() && !matches) return false;
        if (selectedCategory !== 'All' && product.category !== selectedCategory) {
          return false;
        }
        if (priceFilter === 'under25k' && product.price >= 25000) return false;
        if (
          priceFilter === '25kTo60k' &&
          (product.price < 25000 || product.price > 60000)
        ) {
          return false;
        }
        if (priceFilter === 'above60k' && product.price <= 60000) return false;
        if (inStockOnly && (product.cityStock[city] ?? 0) <= 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.product.price - b.product.price;
        if (sortBy === 'price_desc') return b.product.price - a.product.price;
        if (sortBy === 'rating') return b.product.rating - a.product.rating;
        return b.score - a.score;
      })
      .map(({ product }) => product);
  }, [
    catalog,
    debouncedSearch,
    selectedCategory,
    priceFilter,
    inStockOnly,
    city,
    sortBy,
  ]);

  // Pagination slice
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  );
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Hero Spotlight Product & Today Best Deals (5 cards)
  const heroProduct = useMemo(() => {
    return (
      catalog.find((p) => (p.cityStock[city] ?? 0) > 0 && p.isBestDeal) ||
      catalog[0]
    );
  }, [catalog, city]);

  const bestDeals = useMemo(() => {
    const deals = catalog.filter((p) => p.isBestDeal);
    return (deals.length >= 5 ? deals : catalog).slice(0, 5);
  }, [catalog]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return catalog.find((p) => p.id === selectedProductId) || null;
  }, [catalog, selectedProductId]);

  const totalCartItems = cart.reduce((sum, l) => sum + l.quantity, 0);

  // Cart Operations
  const handleAddToCart = (product: MultiCityProduct, qty = 1) => {
    const avail = product.cityStock[city] ?? 0;
    if (avail <= 0) {
      pushToast(
        `Out of stock in ${city}`,
        'Switch city hub or view product details for alternatives.',
        'rescue'
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, avail);
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, product, quantity: nextQty } : l
        );
      }
      return [...prev, { product, quantity: Math.min(qty, avail) }];
    });

    pushToast(
      `Added to ${city} Basket`,
      `${qty} × ${product.name} (₹${product.price.toLocaleString('en-IN')})`,
      'success'
    );
  };

  const handleBuyNow = (product: MultiCityProduct, qty = 1) => {
    handleAddToCart(product, qty);
    setScreen('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const handleReplaceItem = (
    oldProductId: string,
    newProduct: MultiCityProduct,
    quantity: number
  ) => {
    setCart((prev) => {
      const oldItem = prev.find((l) => l.product.id === oldProductId);
      const filtered = prev.filter(
        (l) => l.product.id !== oldProductId && l.product.id !== newProduct.id
      );
      return [
        ...filtered,
        {
          product: newProduct,
          quantity: Math.max(1, quantity || oldItem?.quantity || 1),
        },
      ];
    });
    pushToast(
      'Smart Basket Rescue Applied!',
      `Replaced with ${newProduct.name} in ${city} Hub`,
      'rescue'
    );
  };

  // 1-Click Demo Helper: Launches Smart Basket Rescue demo immediately
  const handleLaunchRescueDemo = () => {
    // Ensure at least 2 items are in the cart so judges see 1 item sell out while the other stays safe
    if (cart.length < 2 && catalog.length >= 2) {
      const inStockItems = catalog.filter((p) => (p.cityStock[city] ?? 0) > 0);
      const itemA = inStockItems[0] || catalog[0];
      const itemB = inStockItems[1] || catalog[1];
      setCart([
        { product: itemA, quantity: 1 },
        { product: itemB, quantity: 1 },
      ]);
    }
    setSimulateConflict(true);
    setScreen('checkout');
    pushToast(
      'Smart Basket Rescue Demo Ready',
      'Click "Place Order" to trigger HTTP 409 stock conflict & 1-click replacement.',
      'rescue'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProductDetail = (product: MultiCityProduct) => {
    setSelectedProductId(product.id);
    setScreen('product_detail');
    setSearchFocused(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetAllFilters = () => {
    setRawSearch('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setPriceFilter('all');
    setInStockOnly(false);
    setSortBy('featured');
    setCurrentPage(1);
  };

  const userDisplayName =
    profile?.full_name ||
    user?.email?.split('@')[0] ||
    'Abhishek Anil';

  return (
    <div className="min-h-screen bg-[#F8F8F3] text-[#101413] selection:bg-[#65B99B] selection:text-white flex flex-col">
      {/* ───────────────────────────────────────────────────────────────────
          1. TOP DARK UTILITY BAR (Matches reference image top dark bar)
      ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-[#0A2540] text-white text-[11px] font-semibold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* Left Quick Links */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onOpenMerchant}
              className="hover:text-[#65B99B] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#65B99B]" />
              <span>Merchant Admin</span>
            </button>
            <span className="text-white/25">|</span>
            <button
              type="button"
              onClick={() => {
                setScreen('pipeline_status');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-[#65B99B] transition-colors flex items-center gap-1.5 cursor-pointer ${
                screen === 'pipeline_status' ? 'text-[#65B99B] font-extrabold' : ''
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#65B99B]" />
              <span>System Status (PG → Kafka → OpenSearch)</span>
            </button>
            <span className="text-white/25 hidden sm:inline">|</span>
            <button
              type="button"
              onClick={handleLaunchRescueDemo}
              className="hidden sm:inline-flex items-center gap-1.5 text-[#E8C86B] hover:underline cursor-pointer font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Smart Basket Rescue</span>
            </button>
          </div>

          {/* Right City Selection (Bengaluru | Mumbai | Delhi) */}
          <div className="flex items-center gap-2">
            <span className="text-white/70 hidden md:inline flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#65B99B] inline mr-1" />
              Fulfillment City:
            </span>
            <div className="inline-flex items-center rounded-full bg-white/10 p-0.5 border border-white/15">
              {CITIES.map((c) => {
                const active = c.name === city;
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleSelectCity(c.name)}
                    className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#65B99B] text-[#0A2540] shadow-2xs'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          2. MAIN WHITE HEADER BAR (Logo | Wide Pill Search | Cart Pill | User)
      ─────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8EBE7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Brand Logo */}
          <button
            type="button"
            onClick={() => {
              setScreen('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] border border-[#C8E8D9] p-1 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
              <BrandLogo className="w-full h-full" />
            </div>
            <div>
              <p className="font-display font-black text-xl text-[#0A2540] tracking-tight leading-none">
                Celerity
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#064E36] mt-0.5">
                {city} Store
              </p>
            </div>
          </button>

          {/* Center: Wide Pill Search Input with Debounced Suggestions & Typo Tolerance */}
          <div
            ref={searchContainerRef}
            className="flex-1 max-w-xl mx-auto relative order-3 md:order-2 w-full md:w-auto"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={rawSearch}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setRawSearch(e.target.value);
                  setSearchFocused(true);
                  if (screen !== 'home') setScreen('home');
                }}
                placeholder={`try "Inspiron", "LG", or typo "lapto", "headfone"...`}
                className="w-full pl-5 pr-20 py-2.5 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] text-xs sm:text-sm font-semibold text-[#0A2540] placeholder:text-[#7C877F] focus:outline-none focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#65B99B]/25 transition-all"
              />
              {rawSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setRawSearch('');
                    setDebouncedSearch('');
                  }}
                  className="absolute right-10 p-1 text-[#7C877F] hover:text-[#0A2540] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Search className="absolute right-4 w-4 h-4 text-[#0A2540]" />
            </div>

            {/* Debounced Suggestions Dropdown */}
            <AnimatePresence>
              {searchFocused && debouncedSearch.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white border border-[#E8EBE7] shadow-xl overflow-hidden z-50"
                >
                  <div className="px-4 py-2.5 bg-[#FAF9F5] border-b border-[#E8EBE7] flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-[#0A2540]">
                      {typoCorrection ? (
                        <>
                          Typo-tolerant match:{' '}
                          <span className="text-[#064E36]">
                            “{debouncedSearch}” → “{typoCorrection}”
                          </span>
                        </>
                      ) : (
                        <>Suggestions in {city} Hub</>
                      )}
                    </span>
                    <span className="text-[#7C877F] font-semibold">
                      {searchSuggestions.length} matches
                    </span>
                  </div>

                  {searchSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#7C877F]">
                      No products matched “{debouncedSearch}”. Try “laptop”, “washing”, or “sony”.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E8EBE7]">
                      {searchSuggestions.map((sug) => {
                        const st = sug.cityStock[city] ?? 0;
                        const badge = getStockBadgeMeta(st);
                        return (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => handleOpenProductDetail(sug)}
                            className="w-full px-4 py-2.5 hover:bg-[#EAF4EC]/50 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={sug.image}
                                alt={sug.name}
                                className="w-10 h-10 rounded-lg object-contain bg-[#FAF9F5] border border-[#E8EBE7] p-1 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-[#0A2540] truncate">
                                  {sug.name}
                                </p>
                                <p className="text-[10px] text-[#7C877F]">
                                  {sug.brand} · {sug.category}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-display font-black text-xs text-[#0A2540]">
                                ₹{sug.price.toLocaleString('en-IN')}
                              </p>
                              <span
                                className={`inline-block text-[9px] font-extrabold px-2 py-0.2 rounded-full border ${badge.pillClass}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Notification/Status Icon | Pill Cart Button [Bag | N Items] | User Profile */}
          <div className="flex items-center gap-3 order-2 md:order-3">
            {/* Pipeline Status Quick Button */}
            <button
              type="button"
              onClick={() =>
                setScreen(
                  screen === 'pipeline_status' ? 'home' : 'pipeline_status'
                )
              }
              title="View PostgreSQL → Kafka → OpenSearch Pipeline Status"
              className={`relative p-2.5 rounded-full border transition-all cursor-pointer ${
                screen === 'pipeline_status'
                  ? 'bg-[#EAF4EC] border-[#064E36] text-[#064E36]'
                  : 'bg-[#FAF9F5] border-[#E8EBE7] text-[#0A2540] hover:bg-[#EAF4EC]'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#064E36]" />
            </button>

            {/* Pill Cart Button matching reference `[Bag | 2 Items]` */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF9F5] hover:bg-[#EAF4EC] border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] cursor-pointer transition-all shadow-2xs"
            >
              <ShoppingBag className="w-4 h-4 text-[#0A2540]" />
              <span>
                {totalCartItems} {totalCartItems === 1 ? 'Item' : 'Items'}
              </span>
            </button>

            <span className="h-5 w-px bg-[#E8EBE7] hidden sm:inline-block" />

            {/* User Profile Pill + Sign Out */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#064E36] text-white text-xs font-black flex items-center justify-center">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-[#0A2540] max-w-[110px] truncate">
                {userDisplayName}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                title="Sign out"
                className="p-1.5 rounded-full text-[#7C877F] hover:text-[#0A2540] hover:bg-[#FAF9F5] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────────────
          MAIN VIEW ROUTER
      ─────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {screen === 'pipeline_status' ? (
          <PipelineStatusView
            city={city}
            catalog={catalog}
            onBack={() => setScreen('home')}
            onResetStockAndTelemetry={() => {
              refreshCatalogFromStore();
              pushToast(
                'Demo Stock & Telemetry Reset',
                `Restored initial multi-city inventory across Bengaluru, Mumbai & Delhi.`,
                'city'
              );
            }}
          />
        ) : screen === 'product_detail' && selectedProduct ? (
          <ProductDetailView
            product={selectedProduct}
            city={city}
            allProducts={catalog}
            onBack={() => setScreen('home')}
            onSelectCity={handleSelectCity}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onSelectProduct={handleOpenProductDetail}
          />
        ) : screen === 'checkout' ||
          screen === 'rescue' ||
          screen === 'confirmed' ? (
          <CheckoutAndRescueView
            mode={screen}
            setMode={(nextMode) => setScreen(nextMode)}
            city={city}
            cart={cart}
            catalog={catalog}
            simulateConflict={simulateConflict}
            setSimulateConflict={setSimulateConflict}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onReplaceItem={handleReplaceItem}
            onOrderSuccess={(order) => {
              setConfirmedOrder(order);
              setCart([]);
              setScreen('confirmed');
              pushToast(
                `Order #${order.orderNumber} Confirmed!`,
                `Dispatched from ${order.city} Hub`,
                'success'
              );
            }}
            confirmedOrder={confirmedOrder}
            onBackToShop={() => setScreen('home')}
            onOpenPipelineStatus={() => setScreen('pipeline_status')}
            onRefreshCatalog={refreshCatalogFromStore}
          />
        ) : (
          /* ───────────────────────────────────────────────────────────────
             HOME / STOREFRONT CATALOG SCREEN (Modeled on Reference Image)
          ─────────────────────────────────────────────────────────────── */
          <div className="space-y-10 pb-12">
            {/* ── 3. TWO-COLUMN BENTO HERO SECTION ── */}
            {heroProduct && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 rounded-[28px] bg-[#FAF9F5] border border-[#E8EBE7] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-2xs">
                  <div className="space-y-4 max-w-md z-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#D97706]">
                        NEW ARRIVAL!
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EAF4EC] border border-[#C8E8D9] text-[10px] font-extrabold text-[#064E36]">
                        {city} Hub · {heroProduct.cityStock[city] ?? 0} in stock
                      </span>
                    </div>

                    <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-[42px] text-[#0A2540] uppercase tracking-tight leading-[1.08]">
                      {heroProduct.name}
                    </h1>

                    <p className="text-xs sm:text-sm text-[#7C877F] leading-relaxed line-clamp-2">
                      {heroProduct.description}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenProductDetail(heroProduct)}
                        className="px-7 py-3.5 rounded-full bg-[#101413] hover:bg-[#0A2540] text-white text-xs font-extrabold cursor-pointer transition-all shadow-sm"
                      >
                        View product
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(heroProduct, 1)}
                        disabled={(heroProduct.cityStock[city] ?? 0) <= 0}
                        className="px-5 py-3.5 rounded-full bg-white hover:bg-[#EAF4EC] border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] disabled:opacity-40 cursor-pointer transition-all"
                      >
                        + Quick Add · ₹{heroProduct.price.toLocaleString('en-IN')}
                      </button>
                    </div>
                  </div>

                  <div
                    onClick={() => handleOpenProductDetail(heroProduct)}
                    className="w-56 h-56 sm:w-64 sm:h-64 rounded-[24px] bg-white border border-[#E8EBE7] p-5 flex items-center justify-center shrink-0 shadow-md cursor-pointer group"
                  >
                    <img
                      src={heroProduct.image}
                      alt={heroProduct.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>

                <div className="lg:col-span-4 rounded-[28px] bg-gradient-to-br from-[#E8D58A] via-[#F2E2B6] to-[#F5EBCB] border border-[#E8C86B] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xs">
                  <div className="space-y-3 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A2540] text-[#E8C86B] text-[10px] font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      Zero Failed Orders
                    </span>
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-[#0A2540] uppercase leading-tight">
                      SMART BASKET RESCUE IN {city.toUpperCase()}
                    </h2>
                    <p className="text-xs text-[#202A24]/80 leading-relaxed">
                      If an item sells out mid-checkout in <strong>{city}</strong>, your remaining cart stays untouched while we offer up to 4 in-stock alternatives within ±20% price.
                    </p>
                  </div>

                  <div className="pt-6 z-10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleLaunchRescueDemo}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#0A2540] text-[#0A2540] hover:text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs"
                    >
                      Try Rescue Flow
                    </button>
                    <span className="text-[11px] font-extrabold text-[#0A2540]/70">
                      ±20% Price Match
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ── 4. "TODAY BEST DEALS!" HORIZONTAL STRIP ── */}
            <section className="rounded-[28px] bg-[#FAF9F5] border border-[#E8EBE7] p-5 sm:p-7 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-black text-xl sm:text-2xl text-[#0A2540]">
                    Today Best Deals!
                  </h2>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EAF4EC] text-[#064E36] text-[11px] font-extrabold">
                    <MapPin className="w-3 h-3" /> {city} Hub Verified
                  </span>
                </div>

                <span className="px-3.5 py-1 rounded-full bg-[#D97706] text-white text-xs font-extrabold tracking-wide">
                  Ends in : 12 : 10 : 09
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {bestDeals.map((deal) => {
                  const dealStock = deal.cityStock[city] ?? 0;
                  const badge = getStockBadgeMeta(dealStock);
                  const liked = !!likedIds[deal.id];

                  return (
                    <div
                      key={deal.id}
                      onClick={() => handleOpenProductDetail(deal)}
                      className="rounded-[22px] bg-white border border-[#E8EBE7] hover:border-[#C8E8D9] p-4 flex flex-col justify-between transition-all hover:shadow-md cursor-pointer group"
                    >
                      <div>
                        {/* Image Container with Stock Badge & Heart */}
                        <div className="relative aspect-4/3 rounded-2xl bg-[#FAF9F5] p-3 mb-3 flex items-center justify-center overflow-hidden">
                          <img
                            src={deal.image}
                            alt={deal.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                          <span
                            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${badge.pillClass}`}
                          >
                            {badge.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLikedIds((prev) => ({
                                ...prev,
                                [deal.id]: !prev[deal.id],
                              }));
                            }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-[#E8EBE7] flex items-center justify-center cursor-pointer"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                liked
                                  ? 'fill-[#D97706] text-[#D97706]'
                                  : 'text-[#0A2540]'
                              }`}
                            />
                          </button>
                        </div>

                        <h3 className="font-display font-bold text-xs sm:text-sm text-[#0A2540] truncate">
                          {deal.name}
                        </h3>

                        <div className="flex items-center gap-1 text-[11px] text-[#7C877F] mt-1">
                          <Star className="w-3.5 h-3.5 fill-[#E8C86B] text-[#E8C86B]" />
                          <span className="font-extrabold text-[#0A2540]">
                            {deal.rating}
                          </span>
                          <span>· {deal.soldCount} Items Sold</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#E8EBE7]/60">
                        <p className="text-[11px] text-[#7C877F] line-through">
                          ₹{deal.mrp.toLocaleString('en-IN')}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-display font-black text-base text-[#0A2540]">
                            ₹{deal.price.toLocaleString('en-IN')}
                          </p>
                          <button
                            type="button"
                            disabled={dealStock <= 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(deal, 1);
                            }}
                            className="px-2.5 py-1 rounded-full bg-[#EAF4EC] hover:bg-[#064E36] text-[#064E36] hover:text-white disabled:opacity-40 text-[10px] font-extrabold transition-colors cursor-pointer"
                          >
                            {dealStock > 0 ? '+ Cart' : 'OOS'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── 5. "SHOP NOW, CHECKOUT SMARTER" MAIN CATALOG SECTION ── */}
            <section ref={catalogSectionRef} className="space-y-6 pt-2">
              {/* Centered Section Header */}
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="font-display font-black text-3xl sm:text-4xl text-[#0A2540] tracking-tight">
                  Shop Now, Checkout Smarter
                </h2>
                <p className="text-xs sm:text-sm text-[#7C877F] leading-relaxed">
                  Explore live inventory in <strong className="text-[#0A2540]">{city}</strong> with instant city-level stock badges, typo-tolerant search, and zero-fail Smart Basket Rescue.
                </p>
              </div>

              {/* Centered Pill Filter Bar (Matches reference image pill filters) */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {/* Category Pill Select */}
                <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540]">
                  <span className="text-[#064E36]">✓</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-transparent focus:outline-none cursor-pointer pr-1"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Pill Select */}
                <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-bold text-[#0A2540]">
                  <select
                    value={priceFilter}
                    onChange={(e) => {
                      setPriceFilter(
                        e.target.value as
                          | 'all'
                          | 'under25k'
                          | '25kTo60k'
                          | 'above60k'
                      );
                      setCurrentPage(1);
                    }}
                    className="bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="all">Price: All</option>
                    <option value="under25k">Under ₹25,000</option>
                    <option value="25kTo60k">₹25,000 – ₹60,000</option>
                    <option value="above60k">Above ₹60,000</option>
                  </select>
                </div>

                {/* City Availability Pill Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setInStockOnly((v) => !v);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2.5 rounded-full border text-xs font-extrabold cursor-pointer transition-all ${
                    inStockOnly
                      ? 'bg-[#064E36] text-white border-[#064E36]'
                      : 'bg-[#FAF9F5] text-[#0A2540] border-[#E8EBE7] hover:bg-[#EAF4EC]'
                  }`}
                >
                  {inStockOnly ? `✓ In Stock in ${city}` : `Availability (${city})`}
                </button>

                {/* Sort Pill Select */}
                <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-bold text-[#0A2540]">
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as
                          | 'featured'
                          | 'price_asc'
                          | 'price_desc'
                          | 'rating'
                      )
                    }
                    className="bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>

                <span className="h-5 w-px bg-[#E8EBE7] hidden sm:inline-block mx-1" />

                {/* Reset / More Filter Pill */}
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FAF9F5] hover:bg-white border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] cursor-pointer transition-all"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#064E36]" />
                  Reset Filters
                </button>
              </div>

              {/* Typo-Tolerant Search Feedback Banner */}
              {debouncedSearch.trim() && (
                <div className="rounded-2xl bg-[#EAF4EC] border border-[#C8E8D9] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#0A2540]">
                    <Sparkles className="w-4 h-4 text-[#064E36]" />
                    {typoCorrection ? (
                      <span>
                        Showing typo-tolerant results for{' '}
                        <strong className="text-[#064E36]">“{typoCorrection}”</strong>{' '}
                        (searched for <em>“{debouncedSearch}”</em>) —{' '}
                        <strong>{filteredProducts.length}</strong> items found.
                      </span>
                    ) : (
                      <span>
                        Search results for{' '}
                        <strong className="text-[#064E36]">“{debouncedSearch}”</strong>{' '}
                        in <strong>{city}</strong> —{' '}
                        <strong>{filteredProducts.length}</strong> items found.
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRawSearch('');
                      setDebouncedSearch('');
                    }}
                    className="text-xs font-extrabold text-[#064E36] hover:underline cursor-pointer"
                  >
                    Clear search
                  </button>
                </div>
              )}

              {/* Loading Skeleton State (on city change) */}
              {isLoadingSkeleton ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="rounded-[24px] bg-white border border-[#E8EBE7] p-4 space-y-3 animate-pulse"
                    >
                      <div className="aspect-square rounded-2xl bg-[#FAF9F5]" />
                      <div className="h-3 w-1/3 rounded bg-[#E8EBE7]" />
                      <div className="h-4 w-3/4 rounded bg-[#E8EBE7]" />
                      <div className="h-5 w-1/2 rounded bg-[#E8EBE7]" />
                      <div className="h-9 w-full rounded-full bg-[#FAF9F5]" />
                    </div>
                  ))}
                </div>
              ) : paginatedProducts.length === 0 ? (
                /* Empty Filter State */
                <div className="rounded-[28px] bg-white border border-dashed border-[#C8E8D9] p-12 text-center space-y-4">
                  <Package className="w-10 h-10 text-[#064E36] mx-auto" />
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="font-display font-black text-xl text-[#0A2540]">
                      No matching products in {city}
                    </h3>
                    <p className="text-xs text-[#7C877F]">
                      Try clearing your active filters or test our typo-tolerant search with queries like “lapto”, “washng”, or “headfone”.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-6 py-3 rounded-full bg-[#064E36] text-white text-xs font-extrabold cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                /* 4-Column Product Grid (Matches reference image bottom cards) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {paginatedProducts.map((product) => {
                    const cityStock = product.cityStock[city] ?? 0;
                    const badge = getStockBadgeMeta(cityStock);
                    const liked = !!likedIds[product.id];

                    return (
                      <motion.article
                        key={product.id}
                        layout
                        className="rounded-[24px] bg-[#FAF9F5] hover:bg-white border border-[#E8EBE7] hover:border-[#C8E8D9] p-4 flex flex-col justify-between transition-all hover:shadow-md group"
                      >
                        <div>
                          {/* Top Row inside Card: "Just in" on left + Heart & Stock Badge on right */}
                          <div className="flex items-center justify-between gap-2 mb-2 px-1">
                            <span className="text-xs font-extrabold text-[#D97706]">
                              {product.isJustIn ? 'Just in' : product.brand}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${badge.pillClass}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`}
                                />
                                {badge.label}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setLikedIds((prev) => ({
                                    ...prev,
                                    [product.id]: !prev[product.id],
                                  }))
                                }
                                className="p-1 text-[#0A2540] hover:text-[#D97706] cursor-pointer"
                              >
                                <Heart
                                  className={`w-4 h-4 ${
                                    liked
                                      ? 'fill-[#D97706] text-[#D97706]'
                                      : ''
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Product Image */}
                          <div
                            onClick={() => handleOpenProductDetail(product)}
                            className="relative aspect-4/3 rounded-2xl bg-white border border-[#E8EBE7] p-4 mb-3.5 flex items-center justify-center overflow-hidden cursor-pointer"
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                            />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-[#FAF9F5]/90 border border-[#E8EBE7] text-[9px] font-bold text-[#7C877F]">
                              {product.sku}
                            </span>
                          </div>

                          {/* Category & Title */}
                          <div
                            onClick={() => handleOpenProductDetail(product)}
                            className="cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#7C877F]">
                              <span>{product.category}</span>
                              <span className="flex items-center gap-1 text-[#0A2540]">
                                <Star className="w-3 h-3 fill-[#E8C86B] text-[#E8C86B]" />
                                {product.rating} ({product.soldCount})
                              </span>
                            </div>

                            <h3 className="font-display font-bold text-sm text-[#0A2540] line-clamp-2 min-h-[2.5rem] group-hover:text-[#064E36] transition-colors">
                              {product.name}
                            </h3>
                          </div>
                        </div>

                        {/* Price & Add to Cart Footer */}
                        <div className="mt-4 pt-3 border-t border-[#E8EBE7] space-y-3">
                          <div className="flex items-baseline justify-between">
                            <div>
                              {product.mrp > product.price && (
                                <p className="text-[10px] text-[#7C877F] line-through">
                                  ₹{product.mrp.toLocaleString('en-IN')}
                                </p>
                              )}
                              <p className="font-display font-black text-lg text-[#0A2540]">
                                ₹{product.price.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenProductDetail(product)}
                              className="text-[11px] font-extrabold text-[#064E36] hover:underline cursor-pointer"
                            >
                              Details →
                            </button>
                          </div>

                          {cityStock > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product, 1)}
                              className="w-full py-2.5 px-4 rounded-full bg-[#0A2540] hover:bg-[#064E36] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-[#65B99B]" />
                              Add to Cart
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenProductDetail(product)}
                              className="w-full py-2.5 px-4 rounded-full bg-[#E8EBE7] text-[#7C877F] hover:text-[#0A2540] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                              title={`Out of stock in ${city}. Click to check other city hubs.`}
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              Out of Stock in {city}
                            </button>
                          )}
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-6 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      catalogSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                      });
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] disabled:opacity-40 hover:bg-[#EAF4EC] cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => {
                          setCurrentPage(pageNum);
                          catalogSectionRef.current?.scrollIntoView({
                            behavior: 'smooth',
                          });
                        }}
                        className={`w-9 h-9 rounded-full text-xs font-extrabold cursor-pointer transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#0A2540] text-white'
                            : 'bg-white border border-[#E8EBE7] text-[#0A2540] hover:bg-[#EAF4EC]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      catalogSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                      });
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] disabled:opacity-40 hover:bg-[#EAF4EC] cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* ───────────────────────────────────────────────────────────────────
          STOREFRONT FOOTER
      ─────────────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#E8EBE7] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7C877F]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#EAF4EC] border border-[#C8E8D9] p-1 flex items-center justify-center">
              <BrandLogo className="w-full h-full" />
            </div>
            <span className="font-display font-black text-[#0A2540]">
              Celerity Commerce
            </span>
            <span>· Multi-City Smart Basket Rescue Engine</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setScreen('pipeline_status');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="font-bold text-[#064E36] hover:underline cursor-pointer"
            >
              PostgreSQL → Kafka → OpenSearch Status
            </button>
            <button
              type="button"
              onClick={() => {
                clearStockOverrides();
                refreshCatalogFromStore();
                pushToast(
                  'Demo Stock Restored',
                  `All ${city} inventory counts reset to initial values.`,
                  'city'
                );
              }}
              className="inline-flex items-center gap-1 font-bold text-[#0A2540] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Demo Stock
            </button>
            <button
              type="button"
              onClick={onOpenMerchant}
              className="font-bold text-[#0A2540] hover:underline cursor-pointer"
            >
              Merchant Admin →
            </button>
          </div>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────────────
          SLIDE-OVER CART DRAWER
      ─────────────────────────────────────────────────────────────────── */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        city={city}
        lines={cart}
        catalog={catalog}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemoveItem}
        onClear={() => setCart([])}
        onProceedToCheckout={(withSimulatedConflict) => {
          setCartOpen(false);
          if (withSimulatedConflict) {
            setSimulateConflict(true);
          }
          setScreen('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* ───────────────────────────────────────────────────────────────────
          TOAST NOTIFICATIONS (Add to Cart, City Change, Replacement Success)
      ─────────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-xl flex items-start gap-3 ${
                t.tone === 'rescue'
                  ? 'bg-[#0A2540] text-white border-[#65B99B]'
                  : t.tone === 'city'
                    ? 'bg-[#EAF4EC] text-[#0A2540] border-[#064E36]'
                    : 'bg-white text-[#0A2540] border-[#C8E8D9]'
              }`}
            >
              {t.tone === 'rescue' ? (
                <Sparkles className="w-5 h-5 text-[#E8C86B] shrink-0 mt-0.5" />
              ) : t.tone === 'city' ? (
                <MapPin className="w-5 h-5 text-[#064E36] shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#064E36] shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold">{t.title}</p>
                {t.subtitle && (
                  <p
                    className={`text-[11px] mt-0.5 leading-snug ${
                      t.tone === 'rescue' ? 'text-white/80' : 'text-[#7C877F]'
                    }`}
                  >
                    {t.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== t.id))
                }
                className="opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
