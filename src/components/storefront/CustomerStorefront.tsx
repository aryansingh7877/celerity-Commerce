import React, { useEffect, useMemo, useState } from 'react';
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
import {
  CATALOG_UPDATED_EVENT,
  loadStorefrontCatalog,
} from '../../lib/merchantInventoryStore';
import { fuzzyScore, interpretQuery } from '../../lib/shopSearch';
import type { Product as StorefrontProduct } from '../../data/products';
import { CartDrawer, CartLine } from './CartDrawer';
import { useAuth } from '../../context/AuthContext';

const HUBS = ['All Hubs', 'Bangalore', 'Mumbai', 'Delhi'] as const;
const CART_KEY = 'celerity_customer_cart_v1';

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

function saveCart(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    /* ignore quota */
  }
}

export const CustomerStorefront: React.FC<CustomerStorefrontProps> = ({ onOpenMerchant }) => {
  const { profile, user, signOut } = useAuth();
  const [catalog, setCatalog] = useState<StorefrontProduct[]>(() => loadStorefrontCatalog());
  const [query, setQuery] = useState('');
  const [hub, setHub] = useState<(typeof HUBS)[number]>('All Hubs');
  const [category, setCategory] = useState('All');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>(() => loadCart());
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const next = loadStorefrontCatalog();
      setCatalog(next);
      // refresh cart product snapshots from latest catalog
      setCart((prev) =>
        prev
          .map((line) => {
            const fresh = next.find((p) => p.id === line.product.id);
            return fresh ? { ...line, product: fresh } : null;
          })
          .filter(Boolean) as CartLine[]
      );
    };
    window.addEventListener(CATALOG_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CATALOG_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(catalog.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [catalog]);

  const interpretation = interpretQuery(query);

  const filtered = useMemo(() => {
    return catalog
      .map((p) => {
        const hay = `${p.name} ${p.brand} ${p.category} ${p.city}`;
        const score = fuzzyScore(query, hay);
        return { p, score };
      })
      .filter(({ p, score }) => {
        if (query.trim() && score < 0.45) return false;
        if (hub !== 'All Hubs' && p.city !== hub) return false;
        if (category !== 'All' && p.category !== category) return false;
        if (inStockOnly && !p.inStock) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .map(({ p }) => p);
  }, [catalog, query, hub, category, inStockOnly]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const addToCart = (product: StorefrontProduct) => {
    if (!product.inStock || product.stock <= 0) {
      setCartOpen(true);
      setCart((prev) => {
        if (prev.some((l) => l.product.id === product.id)) return prev;
        return [...prev, { product: { ...product, inStock: false, stock: 0 }, quantity: 1 }];
      });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: Math.min(l.quantity + 1, product.stock) }
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
      {/* Shop header */}
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
                  Live merchant catalog
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
        {/* Feature strip */}
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
              body: 'Filter Bangalore · Mumbai · Delhi stock from admin upload.',
            },
            {
              icon: Search,
              title: 'Typo-tolerant search',
              body: '“labtop” still finds laptops in the live catalog.',
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

        {/* Filters */}
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

        {/* Mobile hub + admin */}
        <div className="flex lg:hidden items-center gap-2">
          <select
            value={hub}
            onChange={(e) => setHub(e.target.value as (typeof HUBS)[number])}
            className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#101413]/10 text-xs font-semibold"
          >
            {HUBS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onOpenMerchant}
            className="px-3 py-2 rounded-xl bg-white border border-[#101413]/10 text-xs font-bold"
          >
            Admin
          </button>
        </div>

        {/* Catalog */}
        {catalog.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C8E8D9] bg-white px-6 py-16 text-center">
            <Package className="w-10 h-10 text-[#65B99B] mx-auto mb-3" />
            <h2 className="font-display text-xl font-black text-[#0A2540]">Shop is empty</h2>
            <p className="text-sm text-[#101413]/60 mt-2 max-w-md mx-auto">
              No demo products. When the admin uploads an Excel / CSV catalog, those SKUs appear here
              for shopping.
            </p>
            <button
              type="button"
              onClick={onOpenMerchant}
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#064E36] text-white text-sm font-bold cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Go to Merchant Admin
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E8EBE7] p-10 text-center text-sm text-[#7C877F]">
            No products match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filtered.map((prod) => (
              <motion.article
                key={prod.id}
                layout
                className="rounded-3xl bg-white border border-[#101413]/8 p-4 shadow-2xs flex flex-col"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#EAF4EC] mb-3">
                  <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                    {prod.inStock ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#101413]/75 text-[10px] font-bold text-[#65B99B]">
                        <CheckCircle2 className="w-3 h-3" /> {prod.stock}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-950/80 text-[10px] font-bold text-red-300">
                        <AlertCircle className="w-3 h-3" /> Rescue
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 text-[10px] font-semibold text-[#0A2540]">
                      <MapPin className="w-3 h-3 text-[#65B99B]" /> {prod.city}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C877F]">
                  {prod.category}
                </p>
                <h3 className="font-display font-bold text-sm text-[#0A2540] leading-snug mt-0.5 line-clamp-2 min-h-[2.5rem]">
                  {prod.name}
                </h3>
                <p className="text-base font-extrabold text-[#0A2540] mt-2">
                  ₹{prod.price.toLocaleString('en-IN')}
                </p>
                <button
                  type="button"
                  onClick={() => addToCart(prod)}
                  className={`mt-3 w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    addedId === prod.id
                      ? 'bg-[#65B99B] text-[#0A2540]'
                      : 'bg-[#0A2540] hover:bg-[#101413] text-white'
                  }`}
                >
                  {addedId === prod.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Added
                    </>
                  ) : prod.inStock ? (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Add to basket
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#E8C86B]" /> Add · Rescue at checkout
                    </>
                  )}
                </button>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={cart}
        onUpdateQty={updateQty}
        onRemove={(id) => setCart((prev) => prev.filter((l) => l.product.id !== id))}
        onReplace={replaceLine}
        onClear={() => setCart([])}
      />
    </div>
  );
};
