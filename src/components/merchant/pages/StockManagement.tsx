import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  RefreshCw,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Boxes,
} from 'lucide-react';
import { Product } from '../../../types/product';
import { motion } from 'framer-motion';

interface StockManagementPageProps {
  products: Product[];
  onAdjustStock: (productId: string, delta: number) => void;
  onEditProduct: (product: Product) => void;
}

export const StockManagementPage: React.FC<StockManagementPageProps> = ({
  products,
  onAdjustStock,
  onEditProduct,
}) => {
  const lowStockProducts = products.filter((p) => p.stock >= 1 && p.stock <= 10);
  const outOfStockProducts = products.filter((p) => p.stock === 0);
  const healthyProducts = products.filter((p) => p.stock > 10);

  const totalCatalog = products.length || 1;
  const healthRate = Math.round((healthyProducts.length / totalCatalog) * 100);

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ── */}
      <div className="pb-2 border-b border-[#E8EBE7]">
        <h1 className="font-display font-extrabold text-2xl text-[#202A24] tracking-tight">
          Stock Management & Alert Center
        </h1>
        <p className="text-xs text-[#7C877F] mt-1 font-medium">
          Automated stock monitoring, low-inventory notifications, and replenishment triggers.
        </p>
      </div>

      {/* ── 2. Health Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Out of Stock Alert */}
        <div className="p-5 rounded-2xl bg-red-50/60 border border-red-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">
              Zero Stock SKUs
            </span>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="font-display font-extrabold text-3xl text-red-700">
            {outOfStockProducts.length < 10 ? `0${outOfStockProducts.length}` : outOfStockProducts.length}
          </p>
          <p className="text-xs text-red-600 mt-1">
            Immediate reorder required to prevent lost sales
          </p>
        </div>

        {/* Card 2: Low Stock Alert */}
        <div className="p-5 rounded-2xl bg-[#F5EBCB]/50 border border-[#E8D58A] shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#103C2D]">
              Low Inventory Warning
            </span>
            <AlertTriangle className="w-5 h-5 text-[#E5B842]" />
          </div>
          <p className="font-display font-extrabold text-3xl text-[#103C2D]">
            {lowStockProducts.length < 10 ? `0${lowStockProducts.length}` : lowStockProducts.length}
          </p>
          <p className="text-xs text-[#7C877F] mt-1">
            Under 10 units threshold in local hubs
          </p>
        </div>

        {/* Card 3: Catalog Health Rating */}
        <div className="p-5 rounded-2xl bg-[#DCEFE3]/50 border border-[#064E36]/20 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#064E36]">
              Inventory Health Score
            </span>
            <CheckCircle2 className="w-5 h-5 text-[#064E36]" />
          </div>
          <p className="font-display font-extrabold text-3xl text-[#064E36]">
            {healthRate}%
          </p>
          <p className="text-xs text-[#064E36] mt-1 font-medium">
            {healthyProducts.length} of {products.length} products optimally stocked
          </p>
        </div>
      </div>

      {/* ── 3. Critical Attention: Out of Stock Items ── */}
      {outOfStockProducts.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="font-display font-bold text-base text-red-900">
                Critical Depletion: Out of Stock ({outOfStockProducts.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              Sales Impact Active
            </span>
          </div>

          <div className="divide-y divide-[#E8EBE7]">
            {outOfStockProducts.map((p) => (
              <div
                key={p.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] p-1 shrink-0 overflow-hidden">
                    <img src={p.image} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#202A24]">{p.name}</h4>
                    <p className="text-xs text-[#7C877F] font-mono">
                      SKU: {p.sku} • {p.category} • {p.location} Hub
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                    0 Units Available
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(p.id, 20)}
                    className="px-4 py-2 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C8E8D9]" />
                    <span>Quick Restock (+20)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Warning: Low Stock Items (1 - 10 Units) ── */}
      <div className="p-6 rounded-2xl bg-white border border-[#E8EBE7] shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E5B842]" />
            <h2 className="font-display font-bold text-base text-[#202A24]">
              Low Stock Warnings ({lowStockProducts.length})
            </h2>
          </div>
          <span className="text-xs text-[#7C877F]">
            Threshold: &le; 10 units
          </span>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#7C877F]">
            <CheckCircle2 className="w-6 h-6 text-[#064E36] mx-auto mb-1" />
            No products are currently running low on stock.
          </div>
        ) : (
          <div className="divide-y divide-[#E8EBE7]">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] p-1 shrink-0 overflow-hidden">
                    <img src={p.image} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-[#202A24]">{p.name}</h4>
                    <p className="text-xs text-[#7C877F] font-mono">
                      SKU: {p.sku} • {p.category} • {p.location} Hub
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#103C2D] bg-[#F5EBCB] px-2.5 py-1 rounded-full border border-[#E8D58A]">
                    {p.stock} Units Remaining
                  </span>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(p.id, 10)}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#EAF4EC] border border-[#E8EBE7] hover:border-[#064E36] text-[#064E36] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Replenish (+10)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
