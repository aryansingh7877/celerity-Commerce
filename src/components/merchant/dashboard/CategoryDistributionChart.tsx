import React, { useState } from 'react';
import { Layers, ArrowUpRight, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { Product } from '../../../types/product';
import { motion } from 'framer-motion';

interface CategoryDistributionChartProps {
  products: Product[];
  onSelectCategory?: (category: string) => void;
}

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({
  products,
  onSelectCategory,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fallbackCategories = ['Headphones', 'Earphones', 'Laptops', 'Smartphones'];
  const categories = Array.from(
    new Set([...fallbackCategories, ...products.map((p) => p.category).filter(Boolean)])
  );

  const categoryData = categories
    .map((cat) => {
      const items = products.filter((p) => p.category === cat);
      const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
      const totalValue = items.reduce((sum, item) => sum + item.stock * item.price, 0);
      return { category: cat, count: items.length, stock: totalStock, value: totalValue };
    })
    .filter((c) => c.count > 0);

  const totalAllStock = categoryData.reduce((acc, c) => acc + c.stock, 0) || 1;
  const maxStock = Math.max(...categoryData.map((c) => c.stock), 1);
  const topCategory = [...categoryData].sort((a, b) => b.stock - a.stock)[0];

  const colors: Record<string, { bar: string; light: string; text: string; bgBadge: string }> = {
    Headphones: {
      bar: '#064E36',
      light: '#DCEFE3',
      text: '#064E36',
      bgBadge: 'bg-[#DCEFE3]',
    },
    Earphones: {
      bar: '#4E9A7F',
      light: '#EAF4EC',
      text: '#103C2D',
      bgBadge: 'bg-[#EAF4EC]',
    },
    Laptops: {
      bar: '#103C2D',
      light: '#F5EBCB',
      text: '#202A24',
      bgBadge: 'bg-[#F5EBCB]',
    },
    Smartphones: {
      bar: '#0A2540',
      light: '#E9E9D9',
      text: '#0A2540',
      bgBadge: 'bg-[#E9E9D9]',
    },
  };

  return (
    <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#E8EBE7] shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E8EBE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#DCEFE3] text-[#064E36]">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="font-display font-black text-base sm:text-lg text-[#202A24] tracking-tight">
              Stock Distribution by Category
            </h2>
          </div>
          <p className="text-xs text-[#7C877F] mt-1">
            Real-time multi-hub allocation and inventory valuation across catalog segments
          </p>
        </div>

        {/* Total Stock Summary Pill */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-semibold text-[#202A24]">
            Total Allocated:{' '}
            <span className="font-bold text-[#064E36]">
              {categoryData.length === 0 ? 0 : totalAllStock} Units
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Grid: Category Progress Visualizer */}
      <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Bar Visualizer */}
        <div className="lg:col-span-8 space-y-4">
          {categoryData.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#E8EBE7] bg-[#FAF9F5] px-4 py-8 text-center text-xs font-semibold text-[#7C877F]">
              Upload a catalog to unlock category distribution analytics.
            </div>
          )}
          {categoryData.map((catItem) => {
            const percentageOfTotal = Math.round((catItem.stock / totalAllStock) * 100);
            const barWidthPercent = Math.max(8, Math.round((catItem.stock / maxStock) * 100));
            const theme = colors[catItem.category] || {
              bar: '#064E36',
              light: '#DCEFE3',
              text: '#064E36',
              bgBadge: 'bg-[#DCEFE3]',
            };

            const isHovered = activeCategory === catItem.category;

            return (
              <div
                key={catItem.category}
                onMouseEnter={() => setActiveCategory(catItem.category)}
                onMouseLeave={() => setActiveCategory(null)}
                onClick={() => onSelectCategory && onSelectCategory(catItem.category)}
                className={`p-3.5 rounded-xl transition-all duration-200 cursor-pointer border ${
                  isHovered
                    ? 'bg-[#FAF9F5] border-[#064E36]/30 shadow-xs'
                    : 'bg-white border-transparent hover:border-[#E8EBE7]'
                }`}
              >
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: theme.bar }}
                    />
                    <span className="font-bold text-[#202A24] font-display">
                      {catItem.category}
                    </span>
                    <span className="text-[11px] text-[#7C877F]">
                      ({catItem.count} {catItem.count === 1 ? 'product' : 'products'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="font-bold text-[#202A24]">
                      {catItem.stock} units
                    </span>
                    <span className="text-[#7C877F] w-10 text-right">
                      {percentageOfTotal}%
                    </span>
                  </div>
                </div>

                {/* Progress Track */}
                <div className="w-full h-3 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidthPercent}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full transition-all"
                    style={{ backgroundColor: theme.bar }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Category Insight Cards */}
        <div className="lg:col-span-4 bg-[#FAF9F5] p-5 rounded-2xl border border-[#E8EBE7] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C877F]">
              Category Valuation
            </span>
            <span className="text-[11px] font-bold text-[#064E36]">Active SKUs</span>
          </div>

          <div className="space-y-3">
            {categoryData.map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between text-xs py-1.5 border-b border-[#E8EBE7] last:border-none"
              >
                <div>
                  <p className="font-bold text-[#202A24]">{c.category}</p>
                  <p className="text-[10px] text-[#7C877F]">{c.stock} units in hubs</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-[#064E36]">
                    ₹{c.value.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#7C877F]">stock value</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-[#7C877F] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#064E36]" />
            <span>
              {topCategory
                ? <>Highest volume: <strong>{topCategory.category} ({topCategory.stock} units)</strong></>
                : 'No category volume yet'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
