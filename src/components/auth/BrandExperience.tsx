import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  ShoppingBag,
  ArrowUpRight,
  Search,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import StippleFlow from '../originkit/stipple-flow';
import { BrandLogo } from '../common/BrandLogo';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Discover',
    icon: Search,
    cardTheme: 'glass-card-sage',
    iconBg: 'bg-[#9ED7B7]/40 text-[#07152B]',
  },
  {
    step: '02',
    title: 'Validate',
    icon: CheckCircle2,
    cardTheme: 'glass-card-gold',
    iconBg: 'bg-[#F5DE98]/50 text-[#07152B]',
  },
  {
    step: '03',
    title: 'Rescue',
    icon: RefreshCw,
    cardTheme: 'glass-card-sage',
    iconBg: 'bg-[#9ED7B7]/40 text-[#07152B]',
  },
  {
    step: '04',
    title: 'Recover',
    icon: TrendingUp,
    cardTheme: 'glass-card-gold',
    iconBg: 'bg-[#F5DE98]/50 text-[#07152B]',
  },
];

export const BrandExperience: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const brandPillRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        brandPillRef.current,
        { opacity: 0, y: -20, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, delay: 0.1 }
      )
        .fromTo(
          headlineRef.current,
          { opacity: 0, y: 30, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1 },
          '-=0.5'
        )
        .fromTo(
          descRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.6'
        )
        .fromTo(
          workflowRef.current ? workflowRef.current.children : [],
          { opacity: 0, y: 20, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1 },
          '-=0.5'
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[520px] lg:min-h-screen text-[#0A2540] overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14 select-none"
    >
      {/* ── 1. Animated Stipple Flow Layer (blended as kinetic dither texture) ── */}
      <div className="absolute inset-0 z-0 pointer-events-auto opacity-35 mix-blend-multiply">
        <StippleFlow
          text="CELERITY COMMERCE"
          ink="#0A2540"
          background="#E2ECF2"
          speed={32}
          scale={105}
          focus={50}
          stipple={100}
          advanced={{
            grain: 12,
            dotSize: 1,
            dotSoftness: 14,
            falloffStart: 25,
            falloffWidth: 50,
            verticalWeight: 45,
            depthJitter: 22,
            gain: 95,
            gamma: 120,
            vignette: 15,
          }}
          style={{
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
          }}
        />
      </div>

      {/* ── 2. Atmospheric Diffused Radial Lighting ── */}
      <div
        className="absolute top-10 left-10 w-[500px] h-[500px] rounded-full pointer-events-none z-10 opacity-70"
        style={{
          background:
            'radial-gradient(circle, rgba(201, 235, 215, 0.8) 0%, rgba(158, 215, 183, 0.4) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute bottom-20 right-10 w-[460px] h-[460px] rounded-full pointer-events-none z-10 opacity-60"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 222, 152, 0.75) 0%, rgba(229, 184, 66, 0.3) 45%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* ── 4. Top Header & Brand Identity ── */}
      <div className="relative z-20 flex items-center justify-between gap-4">
        <div ref={brandPillRef} className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-md shadow-[#5EAA84]/20 border border-white/80 p-1.5">
            <BrandLogo className="w-full h-full" />
          </div>

          <div className="flex flex-col">
            <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-[#0A2540] leading-none">
              CELERITY <span className="font-semibold text-[#10A37F]">COMMERCE</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10A37F] animate-pulse"></span>
              <span className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#0A2540]/65">
                SMART BASKET RESCUE PLATFORM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Main Center Storytelling Content ── */}
      <div className="relative z-20 my-auto py-8 max-w-2xl">
        <h1
          ref={headlineRef}
          className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-[-0.035em] text-[#0A2540] leading-[1.08] mb-5 text-balance drop-shadow-xs"
        >
          Never lose a sale to an{' '}
          <span className="italic font-normal text-[#10A37F] font-serif">
            empty shelf.
          </span>
        </h1>

        <p
          ref={descRef}
          className="text-[#0A2540]/75 text-sm sm:text-base lg:text-lg font-medium leading-relaxed max-w-xl text-pretty mb-8"
        >
          Inventory changes. Customer journeys shouldn&apos;t. Discover smarter alternatives and
          keep every basket moving.
        </p>

        {/* ── 6. Four Workflow Indicators (Pure Zenvo-Style Frosted Cards) ── */}
        <div
          ref={workflowRef}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5 pt-2"
        >
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className={`group/step relative p-4 rounded-[26px] ${step.cardTheme} cursor-default`}
              >
                {/* Top Row: Squircle Icon & Top-Right Diagonal Arrow ↗ */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${step.iconBg} flex items-center justify-center shadow-xs border border-white/40`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#0A2540]/50 group-hover/step:text-[#0A2540] group-hover/step:translate-x-0.5 group-hover/step:-translate-y-0.5 transition-all duration-300" />
                </div>

                {/* Step Number & Title */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-extrabold tracking-wider text-[#0A2540]/55 uppercase">
                    {step.step}
                  </span>
                  <div className="font-display text-sm sm:text-base font-extrabold text-[#0A2540] tracking-tight">
                    {step.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 7. Clean Minimal Spacing Anchor ── */}
      <div className="relative z-20 h-2" />
    </div>
  );
};
