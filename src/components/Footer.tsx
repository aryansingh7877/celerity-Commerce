import React from 'react';
import { ShoppingBag, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#101413] text-[#F8F8F3] pt-24 pb-12 border-t border-white/10 relative overflow-hidden">
      
      {/* Huge Zenvo-inspired Watermark across footer bottom */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 select-none pointer-events-none text-center w-full z-0 overflow-hidden"
        aria-hidden="true"
      >
        <span className="font-display font-black text-[16vw] leading-none tracking-tighter text-white/[0.025] uppercase block">
          CELERITY
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 pb-16 border-b border-white/10">
          
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2.5 mb-6 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#65B99B] to-[#C8E8D9] flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-4 h-4 text-[#0A2540] stroke-[2.2]" />
              </div>
              <span className="font-display font-extrabold text-xl tracking-tight text-white">
                Celerity<span className="font-normal text-[#65B99B] ml-1">Commerce</span>
              </span>
            </a>

            <p className="text-sm text-[#A4B8AC] max-w-sm leading-relaxed mb-6">
              "Building smarter commerce experiences." <br />
              Autonomous cart preservation and inventory intelligence for high-velocity multi-city retail.
            </p>

            <div className="flex items-center gap-4 text-xs text-[#A4B8AC]">
              <span>Powered by PostgreSQL</span>
              <span>•</span>
              <span>Vector Search</span>
              <span>•</span>
              <span>&lt;45ms Latency</span>
            </div>
          </div>

          {/* Links Column 1: Product */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white mb-4">
              Architecture
            </h4>
            <ul className="space-y-3 text-xs text-[#A4B8AC]">
              <li><a href="#smart-basket-demo" className="hover:text-white transition-colors">Smart Basket Rescue</a></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">PostgreSQL Row Locks</a></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">Levenshtein Discovery</a></li>
              <li><a href="#workflow" className="hover:text-white transition-colors">Similarity Scoring</a></li>
              <li><a href="#showcase" className="hover:text-white transition-colors">Multi-Hub Geofencing</a></li>
            </ul>
          </div>

          {/* Links Column 2: Supported Cities */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white mb-4">
              Fulfillment Hubs
            </h4>
            <ul className="space-y-3 text-xs text-[#A4B8AC]">
              <li className="flex items-center justify-between">
                <span>New York Metro</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
              </li>
              <li className="flex items-center justify-between">
                <span>San Francisco Bay</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
              </li>
              <li className="flex items-center justify-between">
                <span>Greater London</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
              </li>
              <li className="flex items-center justify-between">
                <span>Chicago Loop</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
              </li>
              <li className="flex items-center justify-between">
                <span>Tokyo Central</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#65B99B]"></span>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Company */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white mb-4">
              Resources
            </h4>
            <ul className="space-y-3 text-xs text-[#A4B8AC]">
              <li><a href="#problem" className="hover:text-white transition-colors">Cart Abandonment Whitepaper</a></li>
              <li><a href="#comparison" className="hover:text-white transition-colors">Benchmark Studies</a></li>
              <li><a href="#smart-basket-demo" className="hover:text-white transition-colors">Interactive Sandbox</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Developer API Docs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status &amp; Uptime (99.99%)</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Closing Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A4B8AC]">
          <div>
            © {new Date().getFullYear()} Celerity Commerce Inc. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">System Security</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
