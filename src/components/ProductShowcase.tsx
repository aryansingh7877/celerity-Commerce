import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, CheckCircle2, AlertCircle, ArrowUpRight, Package } from 'lucide-react';
import {
  CATALOG_UPDATED_EVENT,
  loadStorefrontCatalog,
} from '../lib/merchantInventoryStore';
import type { Product } from '../data/products';

export const ProductShowcase: React.FC = () => {
  const [catalog, setCatalog] = useState<Product[]>(() => loadStorefrontCatalog());
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    const refresh = () => setCatalog(loadStorefrontCatalog());
    window.addEventListener(CATALOG_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CATALOG_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(catalog.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [catalog]);

  const filteredProducts =
    activeCategory === 'All'
      ? catalog
      : catalog.filter((p) => p.category === activeCategory);

  return (
    <section id="showcase" className="py-28 md:py-40 bg-cinematic-dark text-[#F8F8F3] relative overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center w-full z-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="font-display font-black text-[20vw] leading-none tracking-tighter text-white/[0.02] uppercase block">
          CURATED
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181E1C] border border-[#26352F] text-xs font-bold uppercase tracking-wider text-[#A4B8AC] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8C86B]"></span>
            Live Merchant Catalog
          </div>

          <h2 className="fluid-section-title font-extrabold tracking-tight text-white mb-6">
            Everything Your Basket Needs. <br />
            <span className="font-editorial italic font-normal text-[#E8C86B]">
              From Your Admin Upload.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-[#A4B8AC] font-normal leading-relaxed">
            Customers only see products the merchant has imported. No demo catalog is shown until
            inventory is uploaded in Merchant Admin.
          </p>

          {categories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2.5 mt-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-[#E8C86B] text-[#101413] shadow-md font-bold'
                      : 'bg-[#181E1C] hover:bg-[#26352F] text-[#A4B8AC] border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#26352F] bg-[#181E1C] px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#26352F] text-[#E8C86B]">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">No products published yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#A4B8AC]">
              Switch to Merchant Admin and upload an Excel / CSV catalog. Those SKUs will appear here
              for customers automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {filteredProducts.map((prod) => (
              <motion.div
                key={prod.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3 }}
                className="glass-card-dark rounded-3xl p-5 border border-white/10 flex flex-col justify-between group relative"
              >
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-5 bg-[#181E1C]">
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    {prod.inStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#101413]/80 backdrop-blur-md text-[10px] font-bold text-[#65B99B] border border-[#65B99B]/30">
                        <CheckCircle2 className="w-3 h-3" /> {prod.stock} in stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/80 backdrop-blur-md text-[10px] font-bold text-red-400 border border-red-500/30">
                        <AlertCircle className="w-3 h-3" /> Auto-Rescue Ready
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#101413]/70 backdrop-blur-md text-[10px] font-medium text-[#A4B8AC]">
                      <MapPin className="w-3 h-3 text-[#E8C86B]" /> {prod.city}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#A4B8AC] mb-1">
                    {prod.brand}
                  </div>
                  <h3 className="font-display font-bold text-base text-white tracking-tight leading-snug mb-2 group-hover:text-[#E8C86B] transition-colors">
                    {prod.name}
                  </h3>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-base font-extrabold text-white font-display">
                      ₹{prod.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#A4B8AC] block">{prod.category}</span>
                  </div>
                  <a
                    href="#smart-basket-demo"
                    className="p-2.5 rounded-xl bg-[#26352F] hover:bg-[#65B99B] text-white hover:text-[#101413] transition-colors flex items-center justify-center cursor-pointer"
                    title="Open Smart Basket"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-16 p-8 rounded-3xl bg-[#181E1C] border border-[#26352F] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E8C86B]/20 border border-[#E8C86B]/30 flex items-center justify-center text-[#E8C86B] flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-bold text-lg text-white">
                {catalog.length} live SKU{catalog.length === 1 ? '' : 's'} from merchant upload
              </h4>
              <p className="text-xs text-[#A4B8AC]">
                Storefront mirrors Merchant Admin inventory — no hardcoded demo products.
              </p>
            </div>
          </div>
          <a
            href="#smart-basket-demo"
            className="px-6 py-3 rounded-full bg-[#65B99B] hover:bg-[#4E9A7F] text-[#101413] font-display font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap"
          >
            Test Basket In Action
          </a>
        </div>
      </div>
    </section>
  );
};
