import React from 'react';
import { BrandExperience } from './BrandExperience';
import { AuthPanel } from './AuthPanel';

export const AuthPage: React.FC = () => {
  return (
    <div className="w-full min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-aurora-mesh relative">
      {/* ── Complete Unclipped Watermark Typography Spanning Across Lower Section ── */}
      <div
        className="absolute bottom-5 sm:bottom-8 lg:bottom-10 left-0 right-0 w-full pointer-events-none select-none z-0 text-center flex justify-center items-center px-4"
        aria-hidden="true"
      >
        <span className="font-display font-black tracking-[0.14em] text-white/70 whitespace-nowrap text-[clamp(1.75rem,5vw,5rem)] leading-none inline-block drop-shadow-xs">
          CELERITY COMMERCE
        </span>
      </div>

      {/* ── Left Column: Brand Experience with Zenvo Glassmorphism & Stipple Flow ── */}
      <section 
        className="w-full lg:w-[60%] lg:h-full relative overflow-hidden flex-shrink-0 z-10"
        aria-label="Celerity Commerce Brand Experience"
      >
        <BrandExperience />
      </section>

      {/* ── Right Column: Login / Signup Panel in Zenvo Frosted Glass Monolith ── */}
      <section 
        className="w-full lg:w-[40%] lg:h-full relative overflow-hidden flex-shrink-0 z-10"
        aria-label="Account Authentication"
      >
        <AuthPanel />
      </section>
    </div>
  );
};

export default AuthPage;
