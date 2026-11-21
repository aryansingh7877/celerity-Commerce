import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Layers
} from 'lucide-react';

export const Hero: React.FC = () => {
  // Mini interactive state in Hero card
  const [isRescued, setIsRescued] = useState(false);

  return (
    <section className="relative min-h-screen pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-aurora-hero flex flex-col justify-between">
      {/* Background Zenvo-style Typographic Watermark */}
      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 select-none pointer-events-none text-center w-full z-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="font-display font-black text-[18vw] leading-none tracking-tighter text-[#101413]/[0.038] uppercase block">
          CELERITY
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Narrative */}
          <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-6">
            
            {/* Super-title Pill */}
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#101413]/10 text-xs font-semibold tracking-wide text-[#101413]/80 mb-6 shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-[#65B99B]"></span>
              <span>Next-Gen Multi-City E-Commerce</span>
              <span className="text-[#101413]/30">|</span>
              <span className="text-[#65B99B] font-bold">Smart Basket Rescue v2.4</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="fluid-hero-title font-extrabold text-[#0A2540] tracking-tight mb-6"
            >
              Never Lose a Sale <br className="hidden sm:inline" />
              to an <span className="relative inline-block text-[#26352F]">
                Empty Shelf.
                <svg className="absolute -bottom-1.5 left-0 w-full h-3 text-[#E8C86B]/60 -z-10" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 15 Q 50 0, 100 12" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-[#101413]/75 max-w-xl font-normal leading-relaxed mb-8"
            >
              Smart Basket Rescue keeps customers moving when inventory changes, automatically discovering the right alternative without losing the rest of their basket.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 w-full sm:w-auto"
            >
              <a
                href="#smart-basket-demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#0A2540] hover:bg-[#101413] text-white text-sm font-semibold tracking-wide transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 group"
              >
                <span>Explore Smart Basket Rescue</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>

              <a
                href="#workflow"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/70 hover:bg-white text-[#101413] text-sm font-semibold tracking-wide border border-[#101413]/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5"
              >
                <span>See How It Works</span>
              </a>
            </motion.div>

            {/* Floating Metric Chips */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="grid grid-cols-3 gap-6 pt-10 mt-6 border-t border-[#101413]/10 w-full max-w-lg"
            >
              <div>
                <span className="block text-2xl font-bold font-display text-[#0A2540] tracking-tight">87.4%</span>
                <span className="text-xs text-[#101413]/60 font-medium">Checkout preservation</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-display text-[#0A2540] tracking-tight">&lt;45ms</span>
                <span className="text-xs text-[#101413]/60 font-medium">Alternative matching</span>
              </div>
              <div>
                <span className="block text-2xl font-bold font-display text-[#0A2540] tracking-tight">Zero</span>
                <span className="text-xs text-[#101413]/60 font-medium">Cart drops on stockouts</span>
              </div>
            </motion.div>
          </div>

          {/* Right Hero Interactive Checkout Mockup */}
          <div className="lg:col-span-5 relative">
            
            {/* Ambient Decorative Cards floating in background (Zenvo reference style) */}
            <div className="absolute -top-8 -left-6 z-0 hidden sm:block">
              <div className="glass-card-mint px-4 py-3 rounded-2xl flex items-center gap-3 w-48 shadow-lg">
                <div className="w-8 h-8 rounded-xl bg-[#65B99B]/30 flex items-center justify-center text-[#0A2540]">
                  <ShieldCheck className="w-4 h-4 text-[#0A2540]" />
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider font-bold text-[#0A2540]">Stock Lock</span>
                  <span className="text-[10px] text-[#101413]/70 font-medium">PostgreSQL Row Valid</span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-4 z-20 hidden sm:block">
              <div className="glass-card-gold px-4 py-3 rounded-2xl flex items-center gap-3 w-52 shadow-lg">
                <div className="w-8 h-8 rounded-xl bg-[#E8C86B]/40 flex items-center justify-center text-[#0A2540]">
                  <Zap className="w-4 h-4 text-[#0A2540]" />
                </div>
                <div>
                  <span className="block text-[11px] uppercase tracking-wider font-bold text-[#0A2540]">Instant Swap</span>
                  <span className="text-[10px] text-[#101413]/70 font-medium">Preserves remaining cart</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Checkout Simulation Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 rounded-3xl p-6 sm:p-7 bg-white/80 backdrop-blur-xl border border-white/90 shadow-2xl overflow-hidden"
            >
              {/* Header of Checkout Preview */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#101413]/8">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#E8C86B]"></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                    Express Checkout
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#101413]/60 bg-[#E9E9D9]/70 px-2.5 py-1 rounded-full">
                  Manhattan Hub
                </span>
              </div>

              {/* Basket Items List */}
              <div className="space-y-3 mb-5">
                {/* Safe Item 1 */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F8F3] border border-[#101413]/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-[#101413]/5 flex-shrink-0">
                      <img 
                        src="https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=80" 
                        alt="Hand Balm" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0A2540] truncate max-w-[170px]">Aēsop Aromatique Balm</h4>
                      <p className="text-[11px] text-[#65B99B] font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> In stock (6 units)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#0A2540]">$35.00</span>
                </div>

                {/* DYNAMIC ITEM: The Out of Stock transitioning into Rescued Item */}
                <AnimatePresence mode="wait">
                  {!isRescued ? (
                    <motion.div 
                      key="unrescued"
                      initial={{ opacity: 0, height: 'auto' }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FFF5F5] to-[#FFF9F5] border-2 border-dashed border-red-300 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/70 overflow-hidden border border-red-200 flex-shrink-0 opacity-60">
                            <img 
                              src="https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=120&q=80" 
                              alt="Cold Brew" 
                              className="w-full h-full object-cover grayscale"
                            />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#101413]/70 line-through">Yirgacheffe Cold Brew</h4>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100/80 px-2 py-0.5 rounded-full mt-0.5">
                              <AlertCircle className="w-2.5 h-2.5" /> Inventory Depleted
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#101413]/50 line-through">$18.50</span>
                      </div>

                      {/* Smart Alternative Prompt Banner */}
                      <div className="mt-2 pt-2.5 border-t border-red-100/80 flex items-center justify-between">
                        <div className="text-[11px] text-[#101413]/80">
                          <span className="font-bold text-[#0A2540]">Smart Alternative:</span> Guji Reserve (+$0.50)
                        </div>
                        <button
                          onClick={() => setIsRescued(true)}
                          className="px-3 py-1.5 rounded-xl bg-[#65B99B] hover:bg-[#4E9A7F] text-white text-[11px] font-bold tracking-tight shadow-sm transition-transform active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>1-Tap Swap</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="rescued"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="p-3.5 rounded-2xl bg-gradient-to-r from-[#EBF7F2] to-[#F2F9F5] border border-[#65B99B] relative shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-[#65B99B]/40 flex-shrink-0">
                            <img 
                              src="https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=120&q=80" 
                              alt="Guji Washed Cold Brew" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-[#0A2540]">Guji Washed Cold Brew</h4>
                              <span className="text-[9px] font-black uppercase tracking-wider text-[#65B99B] bg-[#C8E8D9]/70 px-1.5 py-0.5 rounded">
                                RESCUED
                              </span>
                            </div>
                            <p className="text-[11px] text-[#4E9A7F] font-semibold mt-0.5">
                              ✓ 98% Match · 14 units at Downtown Hub
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-[#0A2540]">$19.00</span>
                          <button 
                            onClick={() => setIsRescued(false)} 
                            className="block text-[10px] text-[#101413]/40 underline hover:text-[#101413] mt-0.5 cursor-pointer ml-auto"
                            title="Reset to out of stock demo"
                          >
                            Undo
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Safe Item 3 */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8F8F3] border border-[#101413]/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white overflow-hidden border border-[#101413]/5 flex-shrink-0">
                      <img 
                        src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=120&q=80" 
                        alt="Ceramic Dripper" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0A2540] truncate max-w-[170px]">Kinto Ceramic Dripper</h4>
                      <p className="text-[11px] text-[#65B99B] font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" /> In stock (12 units)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#0A2540]">$44.00</span>
                </div>
              </div>

              {/* Summary and Primary Action Button */}
              <div className="pt-3 border-t border-[#101413]/10">
                <div className="flex justify-between items-center text-xs mb-3 text-[#101413]/70">
                  <span>Subtotal ({isRescued ? '3 items verified' : '3 items (1 issue)'})</span>
                  <span className="font-bold text-[#0A2540] text-sm">
                    {isRescued ? '$98.00' : '$97.50'}
                  </span>
                </div>

                <a
                  href="#smart-basket-demo"
                  className={`w-full py-3 rounded-2xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-300 ${
                    isRescued 
                      ? 'bg-[#65B99B] hover:bg-[#4E9A7F] text-white shadow-md' 
                      : 'bg-[#0A2540] hover:bg-[#101413] text-white'
                  }`}
                >
                  {isRescued ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Basket Ready — Authorize Order ($98.00)</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Review 1 Pending Inventory Alert</span>
                    </>
                  )}
                </a>
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* Bottom Bar: Ambient Trust Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-12">
        <div className="flex flex-wrap items-center justify-between gap-6 py-4 border-t border-[#101413]/10 text-xs text-[#101413]/60">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-[#0A2540]">Powering High-Velocity Commerce:</span>
            <span className="hover:text-[#0A2540] transition-colors">PostgreSQL Row Locks</span>
            <span className="hover:text-[#0A2540] transition-colors">Distributed Hub Routing</span>
            <span className="hover:text-[#0A2540] transition-colors">Sub-Second Vector Search</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#65B99B]"></span>
            <span>Zero Basket Drop Architecture</span>
          </div>
        </div>
      </div>
    </section>
  );
};
