import React from 'react';
import { MapPin, Phone, User, CheckCircle2, AlertTriangle, Package, ExternalLink, ShieldCheck } from 'lucide-react';
import { Product, StoreLocation } from '../../../types/product';
import { MOCK_LOCATIONS } from '../../../data/mockProducts';
import { motion } from 'framer-motion';

interface StoreLocationsPageProps {
  products: Product[];
  onSelectLocationFilter?: (loc: StoreLocation) => void;
}

export const StoreLocationsPage: React.FC<StoreLocationsPageProps> = ({
  products,
  onSelectLocationFilter,
}) => {
  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ── */}
      <div className="pb-2 border-b border-[#E8EBE7]">
        <h1 className="font-display font-extrabold text-2xl text-[#202A24] tracking-tight">
          Fulfillment Hub Locations
        </h1>
        <p className="text-xs text-[#7C877F] mt-1 font-medium">
          Strategic regional distribution centers servicing Bangalore, Mumbai, and Delhi metro areas.
        </p>
      </div>

      {/* ── 2. Location Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {MOCK_LOCATIONS.map((loc, idx) => {
          const locProducts = products.filter((p) => {
            const normalizedLoc = p.location === 'Bengaluru' ? 'Bangalore' : p.location;
            return normalizedLoc === loc.city;
          });
          const totalUnits = locProducts.reduce((sum, p) => sum + p.stock, 0);

          return (
            <motion.div
              key={loc.city}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.08 }}
              className="bg-white rounded-3xl border border-[#E8EBE7] p-6 sm:p-7 shadow-2xs hover:border-[#064E36]/30 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#DCEFE3] text-[#064E36] flex items-center justify-center shadow-2xs">
                      <MapPin className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h2 className="font-display font-extrabold text-lg text-[#202A24]">
                        {loc.city} Hub
                      </h2>
                      <span className="text-[11px] font-bold text-[#7C877F]">
                        Regional Logistics
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      loc.status === 'Optimal'
                        ? 'bg-[#DCEFE3] text-[#064E36]'
                        : loc.status === 'High Demand'
                        ? 'bg-[#F5EBCB] text-[#103C2D]'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {loc.status}
                  </span>
                </div>

                <p className="text-xs text-[#7C877F] leading-relaxed mb-4">
                  {loc.address}
                </p>

                {/* Logistics Key Figures */}
                <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] mb-5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#7C877F] block">
                      Active Stock
                    </span>
                    <span className="font-display font-extrabold text-base text-[#202A24]">
                      {totalUnits} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#7C877F] block">
                      Fulfillment
                    </span>
                    <span className="font-mono font-bold text-base text-[#064E36]">
                      {loc.fulfillmentRate}%
                    </span>
                  </div>
                </div>

                {/* Manager Contact */}
                <div className="space-y-1.5 py-3 border-t border-[#E8EBE7] text-xs">
                  <div className="flex items-center gap-2 text-[#202A24]">
                    <User className="w-3.5 h-3.5 text-[#7C877F]" />
                    <span className="font-bold">{loc.manager}</span>
                    <span className="text-[10px] text-[#7C877F]">(Hub Lead)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#7C877F]">
                    <Phone className="w-3.5 h-3.5 text-[#7C877F]" />
                    <span>{loc.phone}</span>
                  </div>
                </div>

                {/* Local SKUs Preview */}
                <div className="mt-4 pt-3 border-t border-[#E8EBE7]">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C877F] block mb-2">
                    Stocked SKUs ({locProducts.length}):
                  </span>
                  <div className="space-y-1.5">
                    {locProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#FAF9F5]"
                      >
                        <span className="font-medium text-[#202A24] truncate max-w-[150px]">
                          {p.name}
                        </span>
                        <span className="font-mono font-bold text-[#064E36]">
                          {p.stock} units
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
