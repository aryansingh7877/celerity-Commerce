import React from 'react';
import { motion } from 'framer-motion';
import { X, Check, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';

export const ComparisonSection: React.FC = () => {
  return (
    <section id="comparison" className="py-24 md:py-36 bg-[#F8F8F3] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9E9D9] text-[#0A2540] text-xs font-bold uppercase tracking-wider mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
            Checkout Comparison
          </div>

          <h2 className="fluid-section-title font-extrabold text-[#0A2540] tracking-tight mb-5">
            From checkout interruption <br className="hidden sm:inline" />
            <span className="text-[#65B99B]">to seamless recovery.</span>
          </h2>

          <p className="text-base sm:text-lg text-[#101413]/70 font-normal leading-relaxed">
            See the stark operational difference between traditional e-commerce cart crashes and Celerity's intelligent basket preservation.
          </p>
        </div>

        {/* Before and After Side-by-Side Comparison Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* LEFT: Conventional Checkout (Before / Broken) */}
          <div className="rounded-3xl p-8 sm:p-10 bg-white border border-red-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full pointer-events-none -z-0"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#101413]/8">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-red-500 block mb-1">
                    Conventional Checkout
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-[#0A2540]">
                    The Abandonment Loop
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

              {/* Step Sequence */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A2540]">Item unavailable at payment step</h4>
                    <p className="text-xs text-[#101413]/60 mt-0.5">
                      Customer is notified only when pressing "Pay Now".
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A2540]">Entire checkout interrupted</h4>
                    <p className="text-xs text-[#101413]/60 mt-0.5">
                      System cancels the transaction or wipes out applied voucher codes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A2540]">Manual alternative search</h4>
                    <p className="text-xs text-[#101413]/60 mt-0.5">
                      Customer is forced back to search bars and category filters.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-600">Customer abandons the entire basket</h4>
                    <p className="text-xs text-[#101413]/60 mt-0.5">
                      Order lost forever; merchant pays acquisition costs with zero return.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-[#101413]/8 relative z-10 flex items-center justify-between text-xs text-red-600 font-semibold">
              <span>Abandonment Rate: ~68%</span>
              <span>Conversion Impact: Severe</span>
            </div>
          </div>

          {/* RIGHT: Celerity Commerce (After / Smart Rescue) */}
          <div className="rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-[#EBF7F2] to-[#F8FBF9] border-2 border-[#65B99B] shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#C8E8D9]/40 rounded-bl-full pointer-events-none -z-0"></div>

            <div className="relative z-10">
              <div className="flex items-center justify-between pb-6 mb-8 border-b border-[#65B99B]/20">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#65B99B] block mb-1">
                    Celerity Commerce
                  </span>
                  <h3 className="font-display text-2xl font-extrabold text-[#0A2540]">
                    Smart Basket Rescue
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-[#65B99B] text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Step Sequence */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#65B99B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A2540]">Pre-emptive stock validation</h4>
                    <p className="text-xs text-[#101413]/65 mt-0.5">
                      PostgreSQL locks instantly detect out-of-stock collision.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#65B99B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A2540]">Autonomous suitable alternatives</h4>
                    <p className="text-xs text-[#101413]/65 mt-0.5">
                      Matching engine ranks substitute items in the same price range & category in &lt;45ms.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#65B99B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A2540]">One-click inline replacement</h4>
                    <p className="text-xs text-[#101413]/65 mt-0.5">
                      Customer swaps the SKU with a single tap directly inside the payment drawer.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#65B99B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0A2540]">Continue checkout seamlessly</h4>
                    <p className="text-xs text-[#4E9A7F] font-semibold mt-0.5">
                      Remaining basket is 100% preserved; order clears without delay.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-[#65B99B]/20 relative z-10 flex items-center justify-between text-xs text-[#0A2540] font-bold">
              <span>Checkout Recovery Rate: 87.4%</span>
              <a href="#smart-basket-demo" className="text-[#65B99B] hover:text-[#4E9A7F] inline-flex items-center gap-1">
                <span>Try Demo Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
