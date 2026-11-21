import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, AlertOctagon, TrendingDown, Clock, ArrowRight, XCircle } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  return (
    <section id="problem" className="py-24 md:py-36 bg-[#F8F8F3] relative overflow-hidden">
      {/* Background Subtle Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
        style={{ backgroundImage: 'radial-gradient(#101413 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9E9D9] text-[#101413]/70 text-xs font-bold uppercase tracking-wider mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            The Checkout Bottleneck
          </div>

          <h2 className="fluid-section-title font-extrabold text-[#0A2540] tracking-tight mb-6">
            One missing item. <br className="hidden sm:inline" />
            <span className="text-[#101413]/50">An entire order at risk.</span>
          </h2>

          <p className="text-base sm:text-xl text-[#101413]/75 font-normal leading-relaxed">
            In high-velocity multi-city retail, inventory is fluid. Shoppers add products to their basket, but before they reach payment, the last unit is bought by someone else across town.
          </p>
        </div>

        {/* Narrative Comparison Matrix: CUSTOMERS vs RETAILERS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Customer Group Card */}
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-6 rounded-3xl p-8 sm:p-10 bg-white border border-[#101413]/8 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#101413]/8">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-red-500 block mb-1">
                    Friction Scenario 01
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight">
                    The Customer Experience
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 flex-shrink-0">
                  <XCircle className="w-6 h-6 stroke-[1.8]" />
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#101413]/70 leading-relaxed mb-8">
                A customer spends 15 minutes carefully curating a multi-product order. At the final confirmation step, a generic modal abruptly halts checkout:
              </p>

              {/* The Broken Traditional Checkout Dialog Mock */}
              <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/80 mb-8">
                <div className="flex items-center gap-2.5 text-red-700 font-bold text-xs mb-1.5">
                  <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                  <span>Item Sold Out During Checkout</span>
                </div>
                <p className="text-xs text-red-600/90 leading-relaxed">
                  "Please remove item 'Single-Origin Cold Brew' from your cart to continue."
                </p>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                    ✕
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-[#0A2540] block">Unexpected unavailability</strong>
                    <span className="text-xs text-[#101413]/65">No warning until the final authorization trigger.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                    ✕
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-[#0A2540] block">Interrupted checkout momentum</strong>
                    <span className="text-xs text-[#101413]/65">The entire transaction halts; buyer flow collapses.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                    ✕
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-[#0A2540] block">Manual effort to find alternatives</strong>
                    <span className="text-xs text-[#101413]/65">Forces the customer to re-navigate the catalog, search manually, and verify fulfillment hubs.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-8 mt-8 border-t border-[#101413]/8 flex items-center justify-between text-xs text-[#101413]/60">
              <span className="font-semibold text-red-600">Result: 68% Cart Abandonment</span>
              <span>Average order value dropped to $0</span>
            </div>
          </motion.div>

          {/* Retailer Group Card */}
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-6 rounded-3xl p-8 sm:p-10 bg-[#101413] text-[#F8F8F3] border border-white/10 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/10">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-[#E8C86B] block mb-1">
                    Friction Scenario 02
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    The Retailer's Impact
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-[#E8C86B] flex-shrink-0">
                  <TrendingDown className="w-6 h-6 stroke-[1.8]" />
                </div>
              </div>

              <p className="text-sm sm:text-base text-[#A4B8AC] leading-relaxed mb-8">
                For merchants, this isn't just one missing item. It is a catastrophic leak in the bottom of the conversion funnel, destroying marketing spend and customer lifetime value.
              </p>

              {/* Loss Metric Highlight */}
              <div className="p-5 rounded-2xl bg-[#181E1C] border border-[#26352F] mb-8 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A4B8AC] block">Revenue Loss</span>
                  <span className="font-display text-2xl font-black text-[#E8C86B]">$24.8B</span>
                  <span className="text-[10px] text-[#A4B8AC] block">Annual e-commerce cart dropouts</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#A4B8AC] block">Customer Retargeting</span>
                  <span className="font-display text-2xl font-black text-white">4.2x Cost</span>
                  <span className="text-[10px] text-[#A4B8AC] block">To re-acquire an abandoned cart</span>
                </div>
              </div>

              {/* Bullet Points */}
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#26352F] text-[#E8C86B] flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                    !
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-white block">Failed purchase opportunities</strong>
                    <span className="text-xs text-[#A4B8AC]">High-intent buyers leave with an empty basket despite other available items.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#26352F] text-[#E8C86B] flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                    !
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-white block">Inventory inconsistencies across regional nodes</strong>
                    <span className="text-xs text-[#A4B8AC]">Decoupled database transactions fail to cross-validate stock across adjacent fulfillment hubs.</span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#26352F] text-[#E8C86B] flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                    !
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-white block">Increased checkout friction & permanent churn</strong>
                    <span className="text-xs text-[#A4B8AC]">Frustrated shoppers switch to competitors rather than rebuilding carts manually.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-8 mt-8 border-t border-white/10 flex items-center justify-between text-xs text-[#A4B8AC]">
              <span className="font-semibold text-[#65B99B]">The Solution: Autonomous Basket Rescue</span>
              <a href="#smart-basket-demo" className="text-white hover:text-[#E8C86B] inline-flex items-center gap-1 font-semibold">
                <span>See the Fix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
