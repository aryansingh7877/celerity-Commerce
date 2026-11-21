import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Check,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Info,
  Package,
} from 'lucide-react';
import type { Product, BasketItem } from '../data/products';
import {
  CATALOG_UPDATED_EVENT,
  buildLiveBasketFromCatalog,
} from '../lib/merchantInventoryStore';

export const SmartBasketDemo: React.FC = () => {
  const live = useMemo(() => buildLiveBasketFromCatalog(), []);
  const [basket, setBasket] = useState<BasketItem[]>(live.basket);
  const [alternatives, setAlternatives] = useState<Product[]>(live.alternatives);
  const [selectedAlt, setSelectedAlt] = useState<Product | null>(live.alternatives[0] || null);
  const [isRescued, setIsRescued] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  const reloadFromCatalog = () => {
    const next = buildLiveBasketFromCatalog();
    setBasket(next.basket);
    setAlternatives(next.alternatives);
    setSelectedAlt(next.alternatives[0] || null);
    setIsRescued(false);
    setCheckoutComplete(false);
  };

  useEffect(() => {
    const refresh = () => reloadFromCatalog();
    window.addEventListener(CATALOG_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CATALOG_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const subtotal = basket.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shipping = basket.length > 0 ? 99 : 0;
  const total = subtotal + shipping;
  const unavailable = basket.find((i) => i.status === 'unavailable');
  const referencePrice = unavailable?.product.price ?? selectedAlt?.price ?? 0;

  const handleReplace = (replacement: Product) => {
    setSelectedAlt(replacement);
    setBasket((prev) =>
      prev.map((item) =>
        item.status === 'unavailable' || item.status === 'rescued'
          ? { product: replacement, quantity: 1, status: 'rescued' }
          : item
      )
    );
    setIsRescued(true);
  };

  if (basket.length === 0) {
    return (
      <section id="smart-basket-demo" className="py-24 md:py-36 bg-aurora-soft relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#101413]/10 text-xs font-bold uppercase tracking-wider text-[#0A2540] mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#65B99B]" />
            Live Interactive Simulator
          </div>
          <h2 className="fluid-section-title font-extrabold text-[#0A2540] tracking-tight mb-4">
            Meet Smart Basket Rescue.
          </h2>
          <div className="rounded-3xl border border-dashed border-[#101413]/15 bg-white/70 px-6 py-12">
            <Package className="mx-auto mb-3 h-8 w-8 text-[#65B99B]" />
            <p className="text-sm font-semibold text-[#0A2540]">
              Upload a catalog in Merchant Admin to run this simulator on real SKUs.
            </p>
            <p className="mt-2 text-xs text-[#101413]/60">
              No demo products are shown until the admin imports inventory.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="smart-basket-demo" className="py-24 md:py-36 bg-aurora-soft relative overflow-hidden">
      <div className="absolute top-1/4 -right-40 w-96 h-96 rounded-full bg-[#C8E8D9]/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-40 w-96 h-96 rounded-full bg-[#E8D58A]/30 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#101413]/10 text-xs font-bold uppercase tracking-wider text-[#0A2540] mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#65B99B]" />
            Live Interactive Simulator
          </div>
          <h2 className="fluid-section-title font-extrabold text-[#0A2540] tracking-tight mb-5">
            Meet Smart Basket Rescue.
          </h2>
          <p className="text-base sm:text-lg text-[#101413]/70 font-normal leading-relaxed">
            Running on your merchant-uploaded catalog. Swap an unavailable SKU with a live alternative
            without dumping the rest of the basket.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={reloadFromCatalog}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white text-xs font-semibold text-[#101413]/70 border border-[#101413]/10 transition-all hover:shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-[#65B99B]" />
              Reset From Catalog
            </button>
            <span className="text-xs text-[#101413]/60 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]" />
              Admin catalog active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#101413]/8 shadow-lg">
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#101413]/8">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0A2540]">Live Shopping Basket</h3>
                <p className="text-xs text-[#101413]/55">{basket.length} items from merchant upload</p>
              </div>
              {checkoutComplete ? (
                <span className="text-[11px] font-bold text-[#065E3A] bg-[#DCEFE3] px-2.5 py-1 rounded-full">
                  Order Authorized
                </span>
              ) : unavailable ? (
                <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                  1 item blocked
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#065E3A] bg-[#DCEFE3] px-2.5 py-1 rounded-full">
                  Ready to checkout
                </span>
              )}
            </div>

            <div className="space-y-3">
              {basket.map((item) => (
                <div
                  key={`${item.product.id}-${item.status}`}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    item.status === 'unavailable'
                      ? 'border-red-200 bg-red-50/50'
                      : item.status === 'rescued'
                        ? 'border-[#65B99B]/40 bg-[#C8E8D9]/25'
                        : 'border-[#101413]/8 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-14 h-14 rounded-xl object-cover border border-[#101413]/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-bold text-[#0A2540] truncate ${
                          item.status === 'unavailable' ? 'line-through opacity-70' : ''
                        }`}
                      >
                        {item.product.name}
                      </h4>
                      <p className="text-[11px] text-[#101413]/55">
                        {item.product.city} · Qty {item.quantity}
                        {item.status === 'rescued' ? ' · Rescued' : ''}
                        {item.status === 'unavailable' ? ' · Out of stock' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-[#0A2540] shrink-0">
                    ₹{item.product.price.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-[#101413]/8 space-y-2 text-sm">
              <div className="flex justify-between text-[#101413]/70">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#101413]/70">
                <span>Shipping</span>
                <span>₹{shipping.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-display font-black text-[#0A2540] text-base pt-1">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!!unavailable && !isRescued}
              onClick={() => setCheckoutComplete(true)}
              className={`mt-5 w-full px-5 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                !unavailable || isRescued
                  ? 'bg-[#0A2540] hover:bg-[#101413] text-white cursor-pointer'
                  : 'bg-[#E8EBE7] text-[#7C877F] cursor-not-allowed'
              }`}
            >
              {!unavailable || isRescued ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#65B99B]" />
                  <span>Authorize Order (₹{total.toLocaleString('en-IN')})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>Resolve out-of-stock item to authorize</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass-card-ivory rounded-3xl p-6 sm:p-7 border border-white/80 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#65B99B] animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#0A2540]">
                    Smart Rescue Engine
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#65B99B] bg-[#C8E8D9]/50 px-2.5 py-0.5 rounded-full">
                  {alternatives.length} Matches
                </span>
              </div>

              <h3 className="font-display font-bold text-xl text-[#0A2540] tracking-tight mb-2">
                Suggested Alternatives
              </h3>
              <p className="text-xs text-[#101413]/70 leading-relaxed mb-4">
                Alternatives are scored from the same merchant catalog — same category preferred,
                in-stock only.
              </p>

              <div className="space-y-3">
                {alternatives.length === 0 && (
                  <p className="text-xs text-[#7C877F] font-medium">
                    No alternate in-stock SKUs available in this catalog.
                  </p>
                )}
                {alternatives.map((alt) => {
                  const isCurrentChosen = selectedAlt?.id === alt.id && isRescued;
                  const delta = alt.price - referencePrice;
                  return (
                    <motion.div
                      key={alt.id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isCurrentChosen
                          ? 'bg-[#C8E8D9]/40 border-[#65B99B] shadow-sm'
                          : 'bg-white/80 hover:bg-white border-[#101413]/8'
                      }`}
                      onClick={() => handleReplace(alt)}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={alt.image}
                            alt={alt.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#101413]/10 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-[#0A2540] truncate">{alt.name}</h4>
                              <span className="text-[9px] font-black text-[#26352F] bg-[#E8C86B]/50 px-1.5 py-0.2 rounded shrink-0">
                                {alt.matchScore}% Match
                              </span>
                            </div>
                            <span className="text-[10px] text-[#101413]/60 block mt-0.5">
                              {alt.city} · {alt.stock} units in stock
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-extrabold text-[#0A2540]">
                            ₹{alt.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-[#101413]/40 block">
                            {delta >= 0 ? `+₹${delta.toLocaleString('en-IN')}` : `-₹${Math.abs(delta).toLocaleString('en-IN')}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[#101413]/6 text-[10px]">
                        <span className="text-[#101413]/70 italic truncate max-w-[200px]">
                          "{alt.reason}"
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReplace(alt);
                          }}
                          className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            isCurrentChosen
                              ? 'bg-[#65B99B] text-white shadow-xs'
                              : 'bg-[#0A2540] hover:bg-[#101413] text-white'
                          }`}
                        >
                          {isCurrentChosen ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Swapped</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-[#E8C86B]" />
                              <span>1-Click Replace</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="glass-card-mint rounded-3xl p-5 border border-white/60">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-[#0A2540]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                  Cart Preservation Guarantee
                </h4>
              </div>
              <p className="text-xs text-[#26352F] leading-relaxed">
                Replacing one unavailable line keeps every other merchant-uploaded item in the basket.
                No demo SKUs are injected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
