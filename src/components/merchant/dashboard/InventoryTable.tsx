import React from 'react';
import {
  Edit2,
  Trash2,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Search,
  Filter,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Product, StockStatus } from '../../../types/product';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryTableProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onAdjustStock: (productId: string, delta: number) => void;
  onSelectProductDetails?: (product: Product) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  onSelectProductDetails,
}) => {
  // Helper to calculate status
  const getStockStatus = (stock: number): { label: string; status: StockStatus; badgeClass: string; dotClass: string } => {
    if (stock > 10) {
      return {
        label: 'In Stock',
        status: 'in_stock',
        badgeClass: 'bg-[#DCEFE3] text-[#064E36] border-[#064E36]/20',
        dotClass: 'bg-[#10A37F]',
      };
    }
    if (stock >= 1) {
      return {
        label: 'Low Stock',
        status: 'low_stock',
        badgeClass: 'bg-[#F5EBCB] text-[#103C2D] border-[#E8D58A]',
        dotClass: 'bg-[#E5B842]',
      };
    }
    return {
      label: 'Out of Stock',
      status: 'out_of_stock',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500',
    };
  };

  if (products.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8EBE7] p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-center mx-auto mb-3 text-[#7C877F]">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="font-display font-bold text-base text-[#202A24]">No products found</h3>
        <p className="text-xs text-[#7C877F] mt-1 max-w-sm mx-auto">
          No inventory items match your current filter or search criteria. Try modifying your search or reset the filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8EBE7] shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E8EBE7] bg-[#FAF9F5]/70 text-[11px] font-extrabold uppercase tracking-wider text-[#7C877F]">
              <th className="py-4 px-4 sm:px-6">Product</th>
              <th className="py-4 px-4">SKU</th>
              <th className="py-4 px-4">Category</th>
              <th className="py-4 px-4">Price</th>
              <th className="py-4 px-4">Available Stock</th>
              <th className="py-4 px-4">Store Location</th>
              <th className="py-4 px-4">Stock Status</th>
              <th className="py-4 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EBE7] text-sm">
            <AnimatePresence>
              {products.map((product) => {
                const statusInfo = getStockStatus(product.stock);

                return (
                  <motion.tr
                    key={product.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-[#FAF9F5]/80 transition-colors group"
                  >
                    {/* Product Image & Title */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm text-[#202A24] truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-[#7C877F] line-clamp-1 max-w-[220px]">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#E8EBE7] text-[#202A24]">
                        {product.sku}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF4EC] text-[#064E36] border border-[#C8E8D9]">
                        {product.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4">
                      <span className="font-display font-extrabold text-[#064E36] text-sm">
                        ₹{product.price.toLocaleString()}
                      </span>
                    </td>

                    {/* Stock with inline quick + / - adjustment */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs w-8 text-[#202A24]">
                          {product.stock}
                        </span>

                        {/* Inline Stock Adjustment Controls */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onAdjustStock(product.id, -1)}
                            disabled={product.stock <= 0}
                            title="Decrease stock by 1"
                            aria-label={`Decrease stock for ${product.name}`}
                            className="w-6 h-6 rounded-md border border-[#E8EBE7] bg-white text-[#202A24] hover:bg-[#EAF4EC] hover:text-[#064E36] hover:border-[#064E36]/30 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onAdjustStock(product.id, 1)}
                            title="Increase stock by 1"
                            aria-label={`Increase stock for ${product.name}`}
                            className="w-6 h-6 rounded-md border border-[#E8EBE7] bg-white text-[#202A24] hover:bg-[#EAF4EC] hover:text-[#064E36] hover:border-[#064E36]/30 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Store Location */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-[#202A24] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#064E36]" />
                        <span>{product.location} Hub</span>
                      </div>
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}
                        />
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          title="Edit product"
                          aria-label={`Edit ${product.name}`}
                          className="p-1.5 rounded-lg border border-[#E8EBE7] bg-white text-[#7C877F] hover:text-[#064E36] hover:bg-[#EAF4EC] hover:border-[#064E36]/30 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(product)}
                          title="Delete product"
                          aria-label={`Delete ${product.name}`}
                          className="p-1.5 rounded-lg border border-[#E8EBE7] bg-white text-[#7C877F] hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary */}
      <div className="p-4 bg-[#FAF9F5]/70 border-t border-[#E8EBE7] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7C877F]">
        <p>
          Showing <span className="font-bold text-[#202A24]">{products.length}</span> inventory items
        </p>
        <p className="flex items-center gap-2">
          <span>Rule: <strong>In Stock</strong> (&gt;10)</span>
          <span>•</span>
          <span><strong>Low Stock</strong> (1-10)</span>
          <span>•</span>
          <span><strong>Out of Stock</strong> (0)</span>
        </p>
      </div>
    </div>
  );
};
