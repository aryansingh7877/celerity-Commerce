import React from 'react';
import { Plus, ArrowRight, ShieldCheck, Sparkles, AlertTriangle, Layers, Boxes } from 'lucide-react';
import { Product, MerchantTab } from '../../../types/product';
import { StatsCards } from '../dashboard/StatsCards';
import { CategoryDistributionChart } from '../dashboard/CategoryDistributionChart';
import { InventoryTable } from '../dashboard/InventoryTable';

interface OverviewPageProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onNavigateTab: (tab: MerchantTab) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onAdjustStock: (productId: string, delta: number) => void;
  merchantName?: string;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  products,
  onOpenAddProduct,
  onNavigateTab,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  merchantName = 'Merchant',
}) => {
  const lowStockItems = products.filter((p) => p.stock >= 1 && p.stock <= 10);
  const outOfStockItems = products.filter((p) => p.stock === 0);
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── 1. Page Header with Greeting & Add Product Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EBE7]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCEFE3] text-[#064E36] text-[11px] font-extrabold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#064E36]" />
            Celerity Commerce • Merchant Central
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#202A24] tracking-tight">
            Good morning, {merchantName.split(' ')[0]}.
          </h1>
          <p className="text-xs sm:text-sm text-[#7C877F] mt-1 font-medium">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>

        {/* Prominent Add Product Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-5 py-3 rounded-2xl bg-[#064E36] hover:bg-[#103C2D] text-white font-display font-bold text-sm shadow-md shadow-[#064E36]/20 hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group shrink-0"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 text-[#C8E8D9]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ── 2. Four KPI Metric Cards ── */}
      <StatsCards
        totalProductsCount={products.length}
        totalStockUnits={totalStockUnits}
        lowStockCount={lowStockItems.length}
        outOfStockCount={outOfStockItems.length}
        onFilterLowStock={() => onNavigateTab('stock')}
        onFilterOutOfStock={() => onNavigateTab('stock')}
        onViewAllProducts={() => onNavigateTab('inventory')}
      />

      {/* ── 3. Category Stock Analytics Visualizer ── */}
      <CategoryDistributionChart
        products={products}
        onSelectCategory={() => onNavigateTab('categories')}
      />

      {/* ── 4. Quick Recent Inventory Snapshot ── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-black text-lg text-[#202A24] tracking-tight">
              Active Inventory Snapshot
            </h2>
            <p className="text-xs text-[#7C877F]">
              Direct stock levels with inline adjustment controls
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('inventory')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E36] hover:text-[#103C2D] bg-[#DCEFE3] hover:bg-[#C8E8D9] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <span>View Full Inventory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <InventoryTable
          products={products.slice(0, 5)}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          onAdjustStock={onAdjustStock}
        />
      </div>
    </div>
  );
};
