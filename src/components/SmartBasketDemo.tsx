import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRight, 
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { INITIAL_BASKET, SMART_ALTERNATIVES, Product, BasketItem } from '../data/products';

export const SmartBasketDemo: React.FC = () => {
  const [basket, setBasket] = useState<BasketItem[]>(INITIAL_BASKET);
  const [selectedAlt, setSelectedAlt] = useState<Product>(SMART_ALTERNATIVES[0]);
  const [isRescued, setIsRescued] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  // Recalculate Subtotal
  const subtotal = basket.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const shipping = 5.00;
  const total = subtotal + shipping;

  // Handle Replace action
  const handleReplace = (replacement: Product) => {
    setSelectedAlt(replacement);
    setBasket(prev => prev.map(item => {
      if (item.product.id === 'prod-02' || item.status === 'unavailable' || item.status === 'rescued') {
        return {
          product: replacement,
          quantity: 1,
          status: 'rescued'
        };
      }
      return item;
    }));
    setIsRescued(true);
  };

  // Reset to initial problem state
  const handleReset = () => {
    setBasket(INITIAL_BASKET);
    setIsRescued(false);
    setCheckoutComplete(false);
  };

  return (
    <section id="smart-basket-demo" className="py-24 md:py-36 bg-aurora-soft relative overflow-hidden">
      
      {/* Decorative Aurora Glow */}
      <div className="absolute top-1/4 -right-40 w-96 h-96 rounded-full bg-[#C8E8D9]/40 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-40 w-96 h-96 rounded-full bg-[#E8D58A]/30 blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#101413]/10 text-xs font-bold uppercase tracking-wider text-[#0A2540] mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#65B99B]" />
            Live Interactive Simulator
          </div>

          <h2 className="fluid-section-title font-extrabold text-[#0A2540] tracking-tight mb-5">
            Meet Smart Basket Rescue.
          </h2>

          <p className="text-base sm:text-lg text-[#101413]/70 font-normal leading-relaxed">
            Experience how Celerity preserves order value in real-time. Try swapping the out-of-stock cold brew with an intelligent, price-matched local alternative.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white text-xs font-semibold text-[#101413]/70 border border-[#101413]/10 transition-all hover:shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-[#65B99B]" />
              Reset Simulation State
            </button>
            <span className="text-xs text-[#101413]/40 font-medium">|</span>
            <span className="text-xs text-[#101413]/60 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
              PostgreSQL Mock Active
            </span>
          </div>
        </div>

        {/* Interactive Workspace: Basket (Left) vs Alternative Engine (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Live Shopping Basket */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#101413]/8 shadow-lg">
            
            {/* Basket Top Bar */}
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#101413]/8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F8F8F3] border border-[#101413]/5 flex items-center justify-center font-bold text-[#0A2540]">
                  3
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-[#0A2540]">Active Cart Session</h3>
                  <span className="text-xs text-[#101413]/60 font-medium">
                    Order Ref: #CEL-8942 · Delivery to Brooklyn, NY
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              {isRescued ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8E8D9]/70 text-[#26352F] text-xs font-bold border border-[#65B99B]/30">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#65B99B]" />
                  Basket Rescued
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  1 Out-Of-Stock SKU
                </span>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-4 mb-6">
              {basket.map((item) => (
                <div 
                  key={item.product.id}
                  className={`p-4 rounded-2xl transition-all duration-300 border ${
                    item.status === 'unavailable'
                      ? 'bg-red-50/60 border-red-200'
                      : item.status === 'rescued'
                      ? 'bg-[#EBF7F2] border-[#65B99B]/50'
                      : 'bg-[#F8F8F3] border-[#101413]/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Product Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-white overflow-hidden border border-[#101413]/10 flex-shrink-0 relative">
                        <img 
                          src={item.product.image} 
                          alt={item.product.name} 
                          className={`w-full h-full object-cover ${item.status === 'unavailable' ? 'grayscale opacity-75' : ''}`}
                        />
                        {item.status === 'unavailable' && (
                          <div className="absolute inset-0 bg-red-900/20 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="text-[9px] font-black text-white bg-red-600 px-1 rounded">SOLD</span>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#101413]/50">
                            {item.product.brand}
                          </span>
                          {item.status === 'rescued' && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#65B99B] text-white">
                              RESCUED ITEM
                            </span>
                          )}
                        </div>

                        <h4 className={`text-sm font-bold text-[#0A2540] ${item.status === 'unavailable' ? 'line-through text-[#101413]/60' : ''}`}>
                          {item.product.name}
                        </h4>

                        {/* Inventory Status Note */}
                        {item.status === 'unavailable' && (
                          <p className="text-xs font-semibold text-red-600 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Sold out 3m ago at Manhattan Hub. Alternative available.
                          </p>
                        )}
                        {item.status === 'rescued' && (
                          <p className="text-xs font-semibold text-[#4E9A7F] mt-0.5 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Matched by flavor & category · 14 units at Downtown Hub
                          </p>
                        )}
                        {item.status === 'available' && (
                          <p className="text-xs font-medium text-[#101413]/50 mt-0.5">
                            In stock ({item.product.stock} units) · Ready to pack
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price & Quantity */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-[#0A2540]">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                      <span className="block text-[11px] text-[#101413]/50 mt-0.5">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal Calculation Box */}
            <div className="p-5 rounded-2xl bg-[#F8F8F3] border border-[#101413]/6">
              <div className="space-y-2 text-xs text-[#101413]/70 pb-4 border-b border-[#101413]/8">
                <div className="flex justify-between">
                  <span>Cart Subtotal</span>
                  <span className="font-semibold text-[#0A2540]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Courier Delivery</span>
                  <span className="font-semibold text-[#0A2540]">${shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inventory Guard Assurance</span>
                  <span className="font-semibold text-[#65B99B]">Free (Smart Rescue Active)</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 text-sm font-bold text-[#0A2540] mb-5">
                <span>Total Amount</span>
                <span className="text-lg font-display font-extrabold text-[#0A2540]">${total.toFixed(2)}</span>
              </div>

              {/* Checkout Action Button */}
              <button
                disabled={!isRescued && !checkoutComplete}
                onClick={() => setCheckoutComplete(true)}
                className={`w-full py-3.5 rounded-2xl font-display font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-300 ${
                  checkoutComplete
                    ? 'bg-[#26352F] text-[#E8C86B] shadow-lg'
                    : isRescued
                    ? 'bg-[#65B99B] hover:bg-[#4E9A7F] text-white shadow-md hover:shadow-lg cursor-pointer'
                    : 'bg-[#101413]/20 text-[#101413]/40 cursor-not-allowed'
                }`}
              >
                {checkoutComplete ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#E8C86B]" />
                    <span>✓ Order #CEL-8942 Confirmed & Dispatched!</span>
                  </>
                ) : isRescued ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authorize Rescued Order (${total.toFixed(2)})</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>Resolve 1 Out-Of-Stock Item to Authorize</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT: Smart Recommendation Engine */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Engine Header Card */}
            <div className="glass-card-ivory rounded-3xl p-6 sm:p-7 border border-white/80 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#65B99B] animate-pulse"></div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#0A2540]">
                    Smart Rescue Engine
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#65B99B] bg-[#C8E8D9]/50 px-2.5 py-0.5 rounded-full">
                  3 Matches Generated
                </span>
              </div>

              <h3 className="font-display font-bold text-xl text-[#0A2540] tracking-tight mb-2">
                Suggested Alternatives
              </h3>
              <p className="text-xs text-[#101413]/70 leading-relaxed mb-4">
                Automated similarity scoring evaluated category, price range ($16 - $22), sensory notes, and live inventory in Brooklyn & Downtown Manhattan nodes.
              </p>

              {/* Suggestions List */}
              <div className="space-y-3">
                {SMART_ALTERNATIVES.map((alt) => {
                  const isCurrentChosen = selectedAlt.id === alt.id && isRescued;

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
                        <div className="flex items-center gap-3">
                          <img 
                            src={alt.image} 
                            alt={alt.name} 
                            className="w-12 h-12 rounded-xl object-cover border border-[#101413]/10 flex-shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-[#0A2540]">{alt.name}</h4>
                              <span className="text-[9px] font-black text-[#26352F] bg-[#E8C86B]/50 px-1.5 py-0.2 rounded">
                                {alt.matchScore}% Match
                              </span>
                            </div>
                            <span className="text-[10px] text-[#101413]/60 block mt-0.5">
                              {alt.city} · {alt.stock} units in stock
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-extrabold text-[#0A2540]">${alt.price.toFixed(2)}</span>
                          <span className="text-[10px] text-[#101413]/40 block">
                            {alt.price >= 18.50 ? `+$${(alt.price - 18.50).toFixed(2)}` : `-$${(18.50 - alt.price).toFixed(2)}`}
                          </span>
                        </div>
                      </div>

                      {/* Reason Tag & Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#101413]/6 text-[10px]">
                        <span className="text-[#101413]/70 italic truncate max-w-[200px]">
                          "{alt.reason}"
                        </span>
                        
                        <button
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

            {/* Why This Works Accordion / Benefit Pill */}
            <div className="glass-card-mint rounded-3xl p-5 border border-white/60">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-[#0A2540]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                  Cart Preservation Guarantee
                </h4>
              </div>
              <p className="text-xs text-[#26352F] leading-relaxed">
                Notice that replacing the cold brew did <strong>not</strong> dump the Aēsop Balm or the Ceramic Dripper. Existing promotional vouchers, delivery windows, and checkout sessions remain 100% intact.
              </p>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
