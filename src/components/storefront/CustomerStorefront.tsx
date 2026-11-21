import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Search,
  MapPin,
  Sparkles,
  LayoutDashboard,
  LogOut,
  Package,
  Filter,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { interpretQuery } from '../../lib/shopSearch';
import type { Product as StorefrontProduct } from '../../data/products';
import { CartDrawer, CartLine } from './CartDrawer';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

const HUBS = ['Bengaluru', 'Mumbai', 'Delhi'] as const;
const CART_KEY = 'celerity_customer_cart_v1';
const CITY_KEY = 'celerity_customer_city_v1';

const BRAND_IMAGES: Record<string, string> = {
  dell: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=85',
  hp: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85',
  lenovo: 'https://images.unsplash.com/photo-1525547719571-a2d4ac882e75?auto=format&fit=crop&w=900&q=85',
  asus: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=85',
  acer: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=85',
  apple: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=85',
  msi: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=900&q=85',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=85',
  headphone: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
};

function enhanceImageUrl(raw: string, brand: string, name: string, category: string): string {
  const hay = `${brand} ${name} ${category}`.toLowerCase();
  let url = (raw || '').trim();
  const looksGeneric =
    !url ||
    /photo-1603302576837-37561b2e2302/.test(url) ||
    /photo-1593640408182-31c70c8268f5/.test(url);

  if (looksGeneric) {
    if (/headphone|earbud|audio/.test(hay)) url = BRAND_IMAGES.headphone;
    else if (/phone|mobile|smartphone/.test(hay)) url = BRAND_IMAGES.phone;
    else if (/dell/.test(hay)) url = BRAND_IMAGES.dell;
    else if (/\bhp\b|hewlett/.test(hay)) url = BRAND_IMAGES.hp;
    else if (/lenovo/.test(hay)) url = BRAND_IMAGES.lenovo;
    else if (/asus/.test(hay)) url = BRAND_IMAGES.asus;
    else if (/acer/.test(hay)) url = BRAND_IMAGES.acer;
    else if (/apple|macbook/.test(hay)) url = BRAND_IMAGES.apple;
    else if (/msi/.test(hay)) url = BRAND_IMAGES.msi;
    else if (!url) url = BRAND_IMAGES.dell;
  }

  if (/images\.unsplash\.com/.test(url)) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=900&h=900&q=85`;
  }
  return url;
}


interface CustomerStorefrontProps {
  onOpenMerchant: () => void;
}

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapApiItem(item: Record<string, unknown>, city: string): StorefrontProduct {
  const id = String(item.productId ?? item.id);
  const price = Number(item.price ?? item.offerPrice ?? 0);
  const stock = Number(item.stock ?? 0);
  const name = String(item.name ?? '');
  const brand = String(item.brand ?? '');
  const category = String(item.category ?? '');
  return {
    id,
    name,
    brand,
    category,
    price,
    image: enhanceImageUrl(String(item.imageUrl ?? item.image_url ?? ''), brand, name, category),
    city,
    stock,
    inStock: stock > 0,
    rating: 4.8,
    reviewsCount: Math.max(8, stock * 2),
  };
}

export const CustomerStorefront: React.FC<CustomerStorefrontProps> = ({
  onOpenMerchant,
}) => {
  const { profile, user, signOut } = useAuth();
  const [catalog, setCatalog] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<string>('');
  const [query, setQuery] = useState('');
  const [hub, setHub] = useState<(typeof HUBS)[number]>(() => {
    const saved = localStorage.getItem(CITY_KEY);
    if (saved === 'Bangalore') return 'Bengaluru';
    if (saved && HUBS.includes(saved as (typeof HUBS)[number])) return saved as (typeof HUBS)[number];
    return (profile?.preferred_city as (typeof HUBS)[number]) || 'Bengaluru';
  });
  const [category, setCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(() => loadCart());
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(CITY_KEY, hub);
  }, [hub]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ city: hub, pageSize: '48' });
      if (query.trim()) params.set('q', query.trim());
      if (category !== 'All') params.set('category', category);
      if (inStockOnly) params.set('inStockOnly', 'true');
      const path = query.trim() ? `/api/search?${params}` : `/api/products?${params}`;
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}${path}`);
      const mode = res.headers.get('X-Search-Mode') || '';
      setSearchMode(mode);
      const data = await res.json();
      const items = (data.items || data.products || []) as Record<string, unknown>[];
      setCatalog(items.map((i) => mapApiItem(i, hub)));
    } catch {
      setCatalog([]);
      setSearchMode('offline');
    } finally {
      setLoading(false);
    }
  }, [hub, query, category, inStockOnly]);

  useEffect(() => {
    const t = setTimeout(() => {
      refreshCatalog();
    }, 200);
    // Live stock: poll + refresh when tab regains focus (after checkout elsewhere)
    const poll = setInterval(() => {
      void refreshCatalog();
    }, 12_000);
    const onFocus = () => void refreshCatalog();
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(t);
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshCatalog]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(catalog.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [catalog]);

  const interpretation = interpretQuery(query);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const addToCart = (product: StorefrontProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: Math.min(l.quantity + 1, Math.max(product.stock, 1)) }
            : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 900);
  };

  const updateQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l))
    );
  };

  const replaceLine = (unavailableId: string, replacement: StorefrontProduct) => {
    setCart((prev) => {
      const without = prev.filter(
        (l) => l.product.id !== unavailableId && l.product.id !== replacement.id
      );
      return [...without, { product: replacement, quantity: 1 }];
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F8F3] text-[#101413] selection:bg-[#65B99B] selection:text-white">
      <header className="sticky top-0 z-40 border-b border-[#101413]/8 bg-[#F8F8F3]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#65B99B] to-[#C8E8D9] flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-5 h-5 text-[#0A2540] stroke-[2.2]" />
              </div>
              <div>
                <p className="font-display font-extrabold text-lg text-[#0A2540] leading-none">
                  Celerity<span className="text-[#65B99B] font-normal ml-1">Shop</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-[#101413]/45">
                  {searchMode === 'opensearch'
                    ? 'OpenSearch'
                    : searchMode === 'postgres'
                      ? 'Degraded · Postgres'
                      : 'Live catalog'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="lg:hidden relative p-2.5 rounded-xl bg-white border border-[#101413]/10 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#064E36] text-white text-[9px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C877F]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products (try “labtop”)"
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#101413]/10 text-sm font-medium text-[#0A2540] focus:outline-none focus:ring-2 focus:ring-[#65B99B]/40"
            />
            {interpretation && (
              <p className="absolute left-3 -bottom-5 text-[10px] font-semibold text-[#064E36]">
                Interpreting “{query}” → {interpretation}
              </p>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-[#101413]/10 text-xs font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#65B99B]" />
              <select
                value={hub}
                onChange={(e) => setHub(e.target.value as (typeof HUBS)[number])}
                className="bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {HUBS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0A2540] text-white text-xs font-bold cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#65B99B]" />
              Basket
              {cartCount > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-[#65B99B] text-[#0A2540] text-[10px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenMerchant}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white border border-[#101413]/10 text-xs font-bold text-[#0A2540] cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-2.5 rounded-xl hover:bg-white border border-transparent hover:border-[#101413]/10 cursor-pointer"
              title={profile?.full_name || user?.email || 'Sign out'}
            >
              <LogOut className="w-4 h-4 text-[#0A2540]" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            {
              icon: Sparkles,
              title: 'Smart Basket Rescue',
              body: 'OOS lines swap to in-stock alternatives at checkout.',
            },
            {
              icon: MapPin,
              title: 'Multi-hub inventory',
              body: 'Bengaluru · Mumbai · Delhi stock from Aiven PostgreSQL.',
            },
            {
              icon: Search,
              title: 'OpenSearch + fallback',
              body: 'Typo-tolerant search; Postgres if OpenSearch is down.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl bg-white border border-[#101413]/8 p-4 flex gap-3 shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-[#DCEFE3] text-[#064E36] flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#0A2540]">{f.title}</p>
                <p className="text-[11px] text-[#101413]/55 mt-0.5 leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#7C877F]">
              <Filter className="w-3.5 h-3.5" /> Category
            </span>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                  category === c
                    ? 'bg-[#064E36] text-white'
                    : 'bg-white border border-[#E8EBE7] text-[#202A24] hover:bg-[#EAF4EC]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#0A2540] cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded border-[#101413]/20"
            />
            In stock only
          </label>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white border border-[#E8EBE7] p-10 text-center text-sm text-[#7C877F]">
            Loading catalog…
          </div>
        ) : catalog.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C8E8D9] bg-white px-6 py-16 text-center">
            <Package className="w-10 h-10 text-[#65B99B] mx-auto mb-3" />
            <h2 className="font-display text-xl font-black text-[#0A2540]">Shop is empty</h2>
            <p className="text-sm text-[#101413]/60 mt-2 max-w-md mx-auto">
              No products available for this hub yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {catalog.map((prod) => (
              <motion.article
                key={prod.id}
                layout
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="group relative flex flex-col overflow-hidden rounded-[1.35rem] bg-white border border-[#E8EBE7] shadow-[0_10px_30px_-18px_rgba(10,37,64,0.35)] hover:shadow-[0_22px_50px_-20px_rgba(6,78,54,0.35)] hover:border-[#C8E8D9] transition-shadow duration-300"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(ellipse_at_center,_#F4FAF6_0%,_#E3F0E8_55%,_#D5E8DC_100%)]">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.35)_0%,transparent_35%,rgba(6,78,54,0.06)_100%)]" />
                  {prod.image ? (
                    <img
                      src={prod.image}
                      alt={prod.name}
                      loading="lazy"
                      className="relative z-[1] h-full w-full object-contain p-5 sm:p-6 transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                    />
                  ) : (
                    <div className="relative z-[1] flex h-full w-full items-center justify-center text-[#65B99B]">
                      <Package className="h-12 w-12 opacity-70" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 z-[2]">
                    {prod.inStock ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#064E36] shadow-sm ring-1 ring-[#064E36]/10">
                        <CheckCircle2 className="h-3 w-3" /> {prod.stock} in stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0A2540] px-2.5 py-1 text-[10px] font-bold text-[#F4C7C3] shadow-sm">
                        <AlertCircle className="h-3 w-3" /> Out of stock
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3 z-[2]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#0A2540]/88 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                      <MapPin className="h-3 w-3 text-[#65B99B]" /> {prod.city}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7C877F]">
                      {prod.category}
                    </p>
                    {prod.brand ? (
                      <p className="truncate text-[10px] font-semibold text-[#65B99B]">{prod.brand}</p>
                    ) : null}
                  </div>
                  <h3 className="font-display text-[15px] font-extrabold leading-snug tracking-tight text-[#0A2540] line-clamp-2 min-h-[2.6rem]">
                    {prod.name}
                  </h3>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7C877F]">
                        From
                      </p>
                      <p className="font-display text-xl font-black tracking-tight text-[#064E36]">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(prod)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold cursor-pointer transition-all duration-200 ${
                        addedId === prod.id
                          ? 'bg-[#65B99B] text-[#0A2540] shadow-sm'
                          : 'bg-[#0A2540] text-white shadow-md shadow-[#0A2540]/20 hover:bg-[#064E36] hover:shadow-lg hover:shadow-[#064E36]/25'
                      }`}
                    >
                      {addedId === prod.id ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cart}
        city={hub}
        onUpdateQty={updateQty}
        onRemove={(id) => setCart((prev) => prev.filter((l) => l.product.id !== id))}
        onReplace={replaceLine}
        onClear={() => setCart([])}
        onRefreshCatalog={refreshCatalog}
      />
    </div>
  );
};
