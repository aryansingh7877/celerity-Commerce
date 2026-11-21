import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Grid, Package } from 'lucide-react';
import { Product, StoreLocation } from '../../../types/product';
import { ProductCard } from '../dashboard/ProductCard';

interface ProductsPageProps {
  products: Product[];
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onAdjustStock: (productId: string, delta: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedLocation: StoreLocation;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  onOpenAddProduct,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  searchQuery,
  onSearchChange,
  selectedLocation,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', 'Headphones', 'Earphones', 'Laptops', 'Smartphones'];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedLocation !== 'All Locations' && p.location !== selectedLocation) return false;
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.sku.toLowerCase().includes(q) &&
          !p.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [products, selectedLocation, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EBE7]">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#202A24] tracking-tight">
            Product Showcase Grid
          </h1>
          <p className="text-xs text-[#7C877F] mt-1 font-medium">
            Visual presentation inspired by clean e-commerce cards with direct merchant inventory controls.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddProduct}
          className="px-5 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white font-display font-bold text-xs shadow-md shadow-[#064E36]/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 text-[#C8E8D9]" />
          <span>Add Product</span>
        </button>
      </div>

      {/* ── 2. Filters & Search Pills (Shopcart Reference) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#E8EBE7] shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#064E36] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] hover:bg-[#EAF4EC] text-[#202A24] border border-[#E8EBE7]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7C877F]">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search merchandise..."
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs text-[#202A24] placeholder-[#7C877F]"
          />
        </div>
      </div>

      {/* ── 3. Product Cards Grid ── */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EBE7] p-12 text-center shadow-2xs">
          <Package className="w-10 h-10 text-[#7C877F] mx-auto mb-2 opacity-50" />
          <h3 className="font-display font-bold text-base text-[#202A24]">No merchandise found</h3>
          <p className="text-xs text-[#7C877F] mt-1">
            Try choosing a different category or clearing your search filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={onEditProduct}
              onDelete={onDeleteProduct}
              onAdjustStock={onAdjustStock}
            />
          ))}
        </div>
      )}
    </div>
  );
};
