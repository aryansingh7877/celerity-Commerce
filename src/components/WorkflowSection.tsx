import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Database, 
  Sparkles, 
  RotateCw, 
  ArrowRight, 
  CheckCircle,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { WORKFLOW_STAGES } from '../data/products';

export const WorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const stageIcons = [
    Search,
    Database,
    Sparkles,
    RotateCw
  ];

  return (
    <section id="workflow" className="py-24 md:py-36 bg-[#F8F8F3] relative overflow-hidden border-t border-[#101413]/5">
      {/* Background Zenvo-inspired large typography watermark */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center w-full z-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="font-display font-black text-[22vw] leading-none tracking-tighter text-[#101413]/[0.025] uppercase block">
          PIPELINE
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 md:mb-24 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9E9D9] text-[#0A2540] text-xs font-bold uppercase tracking-wider mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
              Architectural Workflow
            </div>

            <h2 className="fluid-section-title font-extrabold text-[#0A2540] tracking-tight">
              Four steps to an <br className="hidden sm:inline" />
              <span className="text-[#65B99B]">unbreakable checkout.</span>
            </h2>
          </div>

          <p className="text-sm sm:text-base text-[#101413]/70 max-w-md font-normal leading-relaxed">
            From typo-tolerant multi-city discovery to PostgreSQL row-level locks and zero-friction basket recovery.
          </p>
        </div>

        {/* 4 Interactive Stepper Navigation Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const Icon = stageIcons[idx];
            const isActive = activeStep === idx;

            return (
              <button
                key={stage.step}
                onClick={() => setActiveStep(idx)}
                className={`p-4 sm:p-5 rounded-2xl text-left transition-all duration-300 relative border cursor-pointer ${
                  isActive 
                    ? 'bg-white border-[#65B99B] shadow-md -translate-y-1' 
                    : 'bg-[#E9E9D9]/40 hover:bg-[#E9E9D9]/80 border-transparent text-[#101413]/70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-display text-2xl sm:text-3xl font-black ${
                    isActive ? 'text-[#65B99B]' : 'text-[#101413]/30'
                  }`}>
                    {stage.step}
                  </span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-[#C8E8D9]/70 text-[#0A2540]' : 'bg-black/5 text-[#101413]/50'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="font-display font-extrabold text-sm sm:text-base text-[#0A2540] tracking-tight">
                  {stage.name}
                </div>
                <div className="text-[11px] text-[#101413]/55 truncate mt-0.5">
                  {stage.headline}
                </div>

                {isActive && (
                  <motion.div 
                    layoutId="activePill"
                    className="absolute -bottom-[1px] left-6 right-6 h-0.5 bg-[#65B99B] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Deep Dive Stage Display Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl bg-white border border-[#101413]/8 p-8 sm:p-12 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
          >
            {/* Left Narrative */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#65B99B] mb-3">
                <span>Phase {WORKFLOW_STAGES[activeStep].step}</span>
                <span>•</span>
                <span>{WORKFLOW_STAGES[activeStep].name}</span>
              </div>

              <h3 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0A2540] tracking-tight mb-4">
                {WORKFLOW_STAGES[activeStep].headline}
              </h3>

              <p className="text-sm sm:text-base text-[#101413]/75 leading-relaxed mb-8">
                {WORKFLOW_STAGES[activeStep].description}
              </p>

              {/* Architectural Feature Checkpoints */}
              <div className="space-y-3 mb-8">
                {WORKFLOW_STAGES[activeStep].features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#C8E8D9]/70 text-[#26352F] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-[#65B99B]" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-[#0A2540]">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Progress Indicator Action */}
              <div className="flex items-center gap-4 pt-6 border-t border-[#101413]/8">
                <button
                  onClick={() => setActiveStep((prev) => (prev + 1) % 4)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0A2540] hover:bg-[#101413] text-white text-xs font-bold transition-all shadow-sm hover:gap-3 cursor-pointer"
                >
                  <span>Next Step: {WORKFLOW_STAGES[(activeStep + 1) % 4].name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Mock Code / Diagnostic Visualization */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#101413] text-[#F8F8F3] p-5 sm:p-6 border border-white/10 shadow-inner font-mono text-xs">
                
                {/* Simulated Terminal Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 text-[11px] text-[#A4B8AC]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E8C86B]/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#65B99B]/80"></span>
                    <span className="ml-2 font-mono text-[#A4B8AC]">celerity-runtime.sh</span>
                  </div>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-[#E8C86B]">
                    NODE-US-EAST
                  </span>
                </div>

                {/* Simulated Diagnostic Output based on active step */}
                <div className="space-y-3">
                  {activeStep === 0 && (
                    <>
                      <div className="text-[#A4B8AC]">// 01: Typo-tolerant query execution</div>
                      <div className="text-[#65B99B]">$ celerity search --fuzzy "yirga cheffe cold" --city "NYC"</div>
                      <div className="text-white">→ Resolved Query: "Yirgacheffe Cold Brew 750ml" (Levenshtein distance: 2)</div>
                      <div className="text-[#E8C86B]">→ Filter Applied: Category: Beverage | Radius: 4.8 miles | Hub: Downtown</div>
                    </>
                  )}

                  {activeStep === 1 && (
                    <>
                      <div className="text-[#A4B8AC]">// 02: PostgreSQL Row-Level Locking</div>
                      <div className="text-[#65B99B]">BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ;</div>
                      <div className="text-white">SELECT stock_count FROM hub_inventory WHERE sku_id = 'CEL-COLD-750' FOR UPDATE NOWAIT;</div>
                      <div className="text-red-400">! Concurrency trigger: stock_count = 0 (Cart collision detected)</div>
                    </>
                  )}

                  {activeStep === 2 && (
                    <>
                      <div className="text-[#A4B8AC]">// 03: Autonomous Vector & Price Matching</div>
                      <div className="text-[#65B99B]">→ Embedding match against local active catalog...</div>
                      <div className="text-white">Candidate 1: Guji Highland Washed (Score: 0.984 | Diff: +$0.50 | Stock: 14)</div>
                      <div className="text-[#E8C86B]">Candidate 2: Kyoto Slow Drip (Score: 0.942 | Diff: -$0.50 | Stock: 8)</div>
                      <div className="text-[#65B99B]">✓ Top Recommendation generated in 18ms</div>
                    </>
                  )}

                  {activeStep === 3 && (
                    <>
                      <div className="text-[#A4B8AC]">// 04: One-Click Cart Preservation</div>
                      <div className="text-[#65B99B]">REPLACE_ITEM(session_id: 'SESS-8942', old_sku: 'CEL-COLD-750', new_sku: 'CEL-GUJI-750');</div>
                      <div className="text-white">→ Basket preserved: 3/3 items valid</div>
                      <div className="text-white">→ Retained checkout session & applied coupon 'WELCOME20'</div>
                      <div className="text-[#65B99B]">✓ Ready for immediate Stripe/Apple Pay authorization</div>
                    </>
                  )}
                </div>

                {/* Performance Pill Footer */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-[#A4B8AC]">Benchmark Metric:</span>
                  <span className="font-bold text-[#E8C86B]">{WORKFLOW_STAGES[activeStep].metric}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
};
