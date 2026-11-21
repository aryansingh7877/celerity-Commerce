import React from 'react';
import {
  Headphones,
  Laptop,
  Smartphone,
  Layers,
  ArrowRight,
  Boxes,
  TrendingUp,
  Package,
} from 'lucide-react';
import { Product, MerchantTab } from '../../../types/product';
import { motion } from 'framer-motion';

interface CategoriesPageProps {
  products: Product[];
  onNavigateToInventoryWithCategory?: (category: string) => void;
  onEditProduct: (product: Product) => void;
  onAdjustStock: (productId: string, delta: number) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  products,
  onNavigateToInventoryWithCategory,
  onEditProduct,
  onAdjustStock,
}) => {
  const categoryDefs = [
    {
      name: 'Headphones',
      description: 'Over-ear and on-ear audiophile acoustic headsets with active noise cancellation.',
      icon: Headphones,
      themeColor: '#064E36',
      badgeBg: 'bg-[#DCEFE3]',
      badgeText: 'text-[#064E36]',
      borderHover: 'hover:border-[#064E36]/40',
    },
    {
      name: 'Earphones',
      description: 'In-ear true wireless stereo earbuds and magnetic sport neckbands.',
      icon: Layers,
      themeColor: '#4E9A7F',
      badgeBg: 'bg-[#EAF4EC]',
      badgeText: 'text-[#103C2D]',
      borderHover: 'hover:border-[#4E9A7F]/40',
    },
    {
      name: 'Laptops',
      description: 'High-performance computing, ultrabooks, and dedicated gaming rigs.',
      icon: Laptop,
      themeColor: '#103C2D',
      badgeBg: 'bg-[#F5EBCB]',
      badgeText: 'text-[#202A24]',
      borderHover: 'hover:border-[#E8D58A]',
    },
    {
      name: 'Smartphones',
      description: '5G cellular devices with multi-sensor camera arrays and OLED displays.',
      icon: Smartphone,
      themeColor: '#0A2540',
      badgeBg: 'bg-[#E9E9D9]',
      badgeText: 'text-[#0A2540]',
      borderHover: 'hover:border-[#0A2540]/40',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ── */}
      <div className="pb-2 border-b border-[#E8EBE7]">
        <h1 className="font-display font-extrabold text-2xl text-[#202A24] tracking-tight">
          Product Categories
        </h1>
        <p className="text-xs text-[#7C877F] mt-1 font-medium">
          Comprehensive inventory classification, unit distribution, and valuation breakdown.
        </p>
      </div>

      {/* ── 2. Category Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categoryDefs.map((catDef, idx) => {
          const Icon = catDef.icon;
          const catProducts = products.filter((p) => p.category === catDef.name);
          const totalStock = catProducts.reduce((sum, p) => sum + p.stock, 0);
          const totalValue = catProducts.reduce((sum, p) => sum + p.stock * p.price, 0);

          return (
            <motion.div
              key={catDef.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.08 }}
              className={`bg-white rounded-3xl border border-[#E8EBE7] p-6 sm:p-7 shadow-2xs ${catDef.borderHover} transition-all duration-200 flex flex-col justify-between`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl ${catDef.badgeBg} flex items-center justify-center text-[#202A24] shadow-2xs`}
                    >
                      <Icon className="w-6 h-6 stroke-[2]" style={{ color: catDef.themeColor }} />
                    </div>
                    <div>
                      <h2 className="font-display font-extrabold text-xl text-[#202A24] tracking-tight">
                        {catDef.name}
                      </h2>
                      <span className="text-[11px] font-bold text-[#7C877F]">
                        {catProducts.length} {catProducts.length === 1 ? 'Product SKU' : 'Product SKUs'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border border-current/15 ${catDef.badgeBg} ${catDef.badgeText}`}
                  >
                    {totalStock} Total Units
                  </span>
                </div>

                <p className="text-xs text-[#7C877F] leading-relaxed mb-5">
                  {catDef.description}
                </p>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] mb-5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C877F] block">
                      Inventory Units
                    </span>
                    <span className="font-display font-black text-lg text-[#202A24]">
                      {totalStock} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C877F] block">
                      Total Valuation
                    </span>
                    <span className="font-mono font-bold text-lg text-[#064E36]">
                      ₹{totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Products in this Category */}
                <div className="space-y-2 mb-4">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C877F] block">
                    Catalog SKUs in Category:
                  </span>
                  <div className="space-y-2">
                    {catProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E8EBE7] hover:border-[#064E36]/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#E8EBE7] p-0.5 shrink-0 overflow-hidden">
                            <img src={p.image} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#202A24] truncate">{p.name}</p>
                            <p className="text-[10px] text-[#7C877F] font-mono">{p.sku} • {p.location} Hub</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#064E36]">
                            ₹{p.price.toLocaleString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.stock > 10
                                ? 'bg-[#DCEFE3] text-[#064E36]'
                                : p.stock > 0
                                ? 'bg-[#F5EBCB] text-[#103C2D]'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {p.stock} units
                          </span>
                        </div>
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
