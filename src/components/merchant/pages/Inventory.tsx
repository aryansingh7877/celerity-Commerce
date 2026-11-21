import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  Download,
  Boxes,
} from 'lucide-react';
import { Product, ProductCategory, StockStatus, StoreLocation } from '../../../types/product';
import { InventoryTable } from '../dashboard/InventoryTable';

interface InventoryPageProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onAdjustStock: (productId: string, delta: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedLocation: StoreLocation;
  onSelectLocation: (loc: StoreLocation) => void;
}

type SortField = 'name' | 'price' | 'stock';
type SortOrder = 'asc' | 'desc';

export const InventoryPage: React.FC<InventoryPageProps> = ({
  products,
  onOpenAddProduct,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  searchQuery,
  onSearchChange,
  selectedLocation,
  onSelectLocation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'All' | StockStatus>('All');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const categories = ['All', 'Headphones', 'Earphones', 'Laptops', 'Smartphones'];

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Location filter
        if (selectedLocation !== 'All Locations' && product.location !== selectedLocation) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'All' && product.category !== selectedCategory) {
          return false;
        }

        // Stock status filter
        if (selectedStockFilter !== 'All') {
          if (selectedStockFilter === 'in_stock' && product.stock <= 10) return false;
          if (selectedStockFilter === 'low_stock' && (product.stock < 1 || product.stock > 10))
            return false;
          if (selectedStockFilter === 'out_of_stock' && product.stock !== 0) return false;
        }

        // Search query (name, sku, category)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = product.name.toLowerCase().includes(q);
          const matchSku = product.sku.toLowerCase().includes(q);
          const matchCat = product.category.toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'price') {
          diff = a.price - b.price;
        } else if (sortField === 'stock') {
          diff = a.stock - b.stock;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [products, selectedLocation, selectedCategory, selectedStockFilter, searchQuery, sortField, sortOrder]);

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSelectedStockFilter('All');
    onSearchChange('');
    onSelectLocation('All Locations');
    setSortField('name');
    setSortOrder('asc');
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Top Bar: Page Actions & Add Product ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EBE7]">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#202A24] tracking-tight">
            Inventory Telemetry
          </h1>
          <p className="text-xs text-[#7C877F] mt-1 font-medium">
            Manage live stock allocations, pricing, and multi-hub catalog availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAddProduct}
            className="px-5 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white font-display font-bold text-xs shadow-md shadow-[#064E36]/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4 text-[#C8E8D9]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ── 2. Filters & Search Controls Card ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E8EBE7] shadow-2xs space-y-4">
        {/* Row 1: Search & Filter Pills */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C877F]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter by product name, SKU, or category..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-xs font-medium text-[#202A24] placeholder-[#7C877F] transition-all"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#7C877F] hidden sm:inline">Sort:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-semibold text-[#202A24] focus:outline-none focus:border-[#064E36]"
            >
              <option value="name">Product Name</option>
              <option value="price">Price (₹)</option>
              <option value="stock">Stock Quantity</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Switch to ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              className="p-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] hover:bg-[#EAF4EC] hover:text-[#064E36] text-[#202A24] transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="uppercase text-[10px]">{sortOrder}</span>
            </button>

            {(selectedCategory !== 'All' ||
              selectedStockFilter !== 'All' ||
              searchQuery ||
              selectedLocation !== 'All Locations') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl border border-[#E8EBE7] bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Category Filter Pills inspired by Shopcart */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8EBE7]/70">
          <span className="text-xs font-bold text-[#7C877F] mr-1">Category:</span>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#064E36] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] hover:bg-[#EAF4EC] text-[#202A24] border border-[#E8EBE7]'
                }`}
              >
                {cat}
              </button>
            );
          })}

          <div className="h-4 w-px bg-[#E8EBE7] mx-2 hidden sm:block" />

          {/* Stock Status Pills */}
          <span className="text-xs font-bold text-[#7C877F] mr-1">Stock:</span>
          {(['All', 'in_stock', 'low_stock', 'out_of_stock'] as const).map((status) => {
            const isSelected = selectedStockFilter === status;
            const labels: Record<string, string> = {
              All: 'All Status',
              in_stock: 'In Stock (>10)',
              low_stock: 'Low Stock (1-10)',
              out_of_stock: 'Out of Stock (0)',
            };

            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStockFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#103C2D] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] hover:bg-[#EAF4EC] text-[#202A24] border border-[#E8EBE7]'
                }`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. The Inventory Table ── */}
      <InventoryTable
        products={filteredProducts}
        onEditProduct={onEditProduct}
        onDeleteProduct={onDeleteProduct}
        onAdjustStock={onAdjustStock}
      />
    </div>
  );
};
