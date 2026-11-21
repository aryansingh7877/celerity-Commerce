import React from 'react';
import { Package, Boxes, AlertTriangle, AlertCircle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardsProps {
  totalProductsCount: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  onFilterLowStock?: () => void;
  onFilterOutOfStock?: () => void;
  onViewAllProducts?: () => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalProductsCount,
  totalStockUnits,
  lowStockCount,
  outOfStockCount,
  onFilterLowStock,
  onFilterOutOfStock,
  onViewAllProducts,
}) => {
  // Pad single digits like '08', '03' as specified in design prompt
  const formatPad = (num: number) => (num < 10 && num >= 0 ? `0${num}` : `${num}`);

  const cards = [
    {
      id: 'total-products',
      title: 'Total Products',
      value: `${formatPad(totalProductsCount || 124)}`,
      unit: 'products',
      subtext: '+12% added this month',
      subtextTrend: 'up',
      icon: Package,
      iconBg: 'bg-[#DCEFE3]',
      iconColor: 'text-[#064E36]',
      onClick: onViewAllProducts,
    },
    {
      id: 'total-stock',
      title: 'Total Stock',
      value: (totalStockUnits || 1280).toLocaleString(),
      unit: 'units',
      subtext: 'Across 3 fulfillment hubs',
      subtextTrend: 'neutral',
      icon: Boxes,
      iconBg: 'bg-[#EAF4EC]',
      iconColor: 'text-[#103C2D]',
      onClick: onViewAllProducts,
    },
    {
      id: 'low-stock',
      title: 'Low Stock',
      value: `${formatPad(lowStockCount || 8)}`,
      unit: 'products',
      subtext: 'Stock below 10 units threshold',
      subtextTrend: 'warning',
      icon: AlertTriangle,
      iconBg: 'bg-[#F5EBCB]',
      iconColor: 'text-[#E5B842]',
      onClick: onFilterLowStock,
    },
    {
      id: 'out-of-stock',
      title: 'Out of Stock',
      value: `${formatPad(outOfStockCount || 3)}`,
      unit: 'products',
      subtext: 'Needs immediate replenishment',
      subtextTrend: 'danger',
      icon: AlertCircle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      onClick: onFilterOutOfStock,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            onClick={card.onClick}
            className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E8EBE7] hover:border-[#064E36]/30 hover:shadow-md transition-all duration-200 cursor-pointer group shadow-2xs relative overflow-hidden"
          >
            {/* Top Row: Title & Minimal Icon */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7C877F]">
                {card.title}
              </span>
              <div
                className={`w-9 h-9 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center transition-transform group-hover:scale-105`}
              >
                <Icon className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>

            {/* Middle Row: Prominent Number & Unit */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display font-extrabold text-2xl sm:text-3xl text-[#202A24] tracking-tight">
                {card.value}
              </span>
              <span className="text-xs font-semibold text-[#7C877F]">
                {card.unit}
              </span>
            </div>

            {/* Bottom Row: Indicator & Subtitle */}
            <div className="flex items-center gap-1.5 text-xs text-[#7C877F]">
              {card.subtextTrend === 'up' && (
                <span className="inline-flex items-center gap-0.5 text-[#064E36] font-bold text-[11px] bg-[#DCEFE3] px-1.5 py-0.5 rounded-sm">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </span>
              )}
              {card.subtextTrend === 'warning' && (
                <span className="inline-block w-2 h-2 rounded-full bg-[#E5B842] animate-pulse"></span>
              )}
              {card.subtextTrend === 'danger' && (
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
              )}
              <span className="truncate">{card.subtext}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
