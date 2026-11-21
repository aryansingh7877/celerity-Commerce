import React from 'react';
import {
  Plus,
  ArrowRight,
  Sparkles,
  Upload,
  FileSpreadsheet,
  BarChart3,
  Package,
} from 'lucide-react';
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
  const catalogValue = products.reduce((acc, p) => acc + p.stock * p.price, 0);
  const isEmpty = products.length === 0;

  return (
    <div className="space-y-6 sm:space-y-8">
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
            {isEmpty
              ? 'Your catalog is empty — upload an Excel / CSV sheet. Imports are saved in this browser.'
              : "Here's what's happening with your store today."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-5 py-3 rounded-2xl bg-[#064E36] hover:bg-[#103C2D] text-white font-display font-bold text-sm shadow-md shadow-[#064E36]/20 hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center gap-2 group shrink-0"
          >
            {isEmpty ? (
              <Upload className="w-4 h-4 text-[#C8E8D9]" />
            ) : (
              <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 text-[#C8E8D9]" />
            )}
            <span>{isEmpty ? 'Upload Catalog' : 'Add Product'}</span>
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-3xl border border-dashed border-[#C8E8D9] bg-white/80 px-6 py-14 sm:py-16 text-center shadow-2xs">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#DCEFE3] text-[#064E36]">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <h2 className="font-display text-xl font-black tracking-tight text-[#202A24]">
            No inventory yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#7C877F]">
            Upload <span className="font-bold text-[#064E36]">.xlsx / .csv</span> with product rows
            and embedded images. Overview KPIs, category analytics, and stock tables appear only after
            a successful import.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#064E36] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#064E36]/20 transition hover:bg-[#103C2D]"
            >
              <Upload className="h-4 w-4" />
              Upload Excel / CSV
            </button>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#7C877F]">
              <BarChart3 className="h-3.5 w-3.5" />
              Analytics unlock after import
            </div>
          </div>
        </div>
      ) : (
        <>
          <StatsCards
            totalProductsCount={products.length}
            totalStockUnits={totalStockUnits}
            lowStockCount={lowStockItems.length}
            outOfStockCount={outOfStockItems.length}
            onFilterLowStock={() => onNavigateTab('stock')}
            onFilterOutOfStock={() => onNavigateTab('stock')}
            onViewAllProducts={() => onNavigateTab('inventory')}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E8EBE7] bg-white p-4 shadow-2xs">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C877F]">
                Catalog SKUs
              </p>
              <p className="mt-1 font-display text-2xl font-black text-[#202A24]">{products.length}</p>
            </div>
            <div className="rounded-2xl border border-[#E8EBE7] bg-white p-4 shadow-2xs">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C877F]">
                Units on hand
              </p>
              <p className="mt-1 font-display text-2xl font-black text-[#202A24]">{totalStockUnits}</p>
            </div>
            <div className="rounded-2xl border border-[#E8EBE7] bg-white p-4 shadow-2xs">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7C877F]">
                Inventory value
              </p>
              <p className="mt-1 font-display text-2xl font-black text-[#202A24]">
                ₹{catalogValue.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <CategoryDistributionChart
            products={products}
            onSelectCategory={() => onNavigateTab('categories')}
          />

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-lg text-[#202A24] tracking-tight">
                  Active Inventory Snapshot
                </h2>
                <p className="text-xs text-[#7C877F]">
                  Latest imported SKUs with inline stock controls
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('inventory')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#064E36] hover:text-[#103C2D] bg-[#DCEFE3] hover:bg-[#C8E8D9] px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>View Full Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <InventoryTable
              products={products.slice(0, 8)}
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
              onAdjustStock={onAdjustStock}
            />
          </div>
        </>
      )}
    </div>
  );
};
