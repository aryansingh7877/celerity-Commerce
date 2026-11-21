import React from 'react';
import {
  Edit2,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Search,
  MapPin,
  MessageSquare,
  Lightbulb,
  CreditCard,
} from 'lucide-react';
import { Product, StockStatus } from '../../../types/product';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryTableProps {
  products: Product[];
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onAdjustStock: (productId: string, delta: number) => void;
  onInformSupplier?: (product: Product) => void;
  onSuggestDeadStockSolutions?: (product: Product) => void;
  onOpenPaymentDiscounts?: (product: Product) => void;
  onSelectProductDetails?: (product: Product) => void;
}

export const DEAD_STOCK_THRESHOLD = 100;

export const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onEditProduct,
  onDeleteProduct,
  onAdjustStock,
  onInformSupplier,
  onSuggestDeadStockSolutions,
  onOpenPaymentDiscounts,
}) => {
  const getStockStatus = (
    stock: number
  ): {
    label: string;
    status: StockStatus | 'dead_stock';
    badgeClass: string;
    dotClass: string;
  } => {
    if (stock >= DEAD_STOCK_THRESHOLD) {
      return {
        label: 'Dead Stock',
        status: 'dead_stock',
        badgeClass: 'bg-[#F5EBCB] text-[#7A5800] border-[#E8D58A]',
        dotClass: 'bg-[#D97706]',
      };
    }
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
        <h3 className="font-display font-bold text-base text-[#202A24]">
          No products found
        </h3>
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
              <th className="py-4 px-3">SKU</th>
              <th className="py-4 px-3">Category</th>
              <th className="py-4 px-3">Price &amp; Offers</th>
              <th className="py-4 px-3">Available Stock</th>
              <th className="py-4 px-3">Store Location</th>
              <th className="py-4 px-3">Stock Status</th>
              <th className="py-4 px-4">Recommended Action</th>
              <th className="py-4 px-4 sm:px-6 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EBE7] text-sm">
            <AnimatePresence>
              {products.map((product) => {
                const statusInfo = getStockStatus(product.stock);
                const isLowOrOut = product.stock <= 10;
                const isDeadStock = product.stock >= DEAD_STOCK_THRESHOLD;
                const offers = product.paymentOffers || [];

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
                          <p className="font-display font-bold text-sm text-[#202A24] truncate max-w-[210px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-[#7C877F] line-clamp-1 max-w-[210px]">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#E8EBE7] text-[#202A24]">
                        {product.sku}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF4EC] text-[#064E36] border border-[#C8E8D9]">
                        {product.category}
                      </span>
                    </td>

                    {/* Price & Active Payment Method Discounts */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div>
                        <span className="font-display font-extrabold text-[#064E36] text-sm">
                          ₹{product.price.toLocaleString('en-IN')}
                        </span>
                        {offers.length > 0 && (
                          <div className="flex flex-col gap-1 mt-1">
                            {offers.slice(0, 2).map((o) => (
                              <span
                                key={o.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#DCEFE3] text-[#064E36] text-[10px] font-extrabold w-fit"
                              >
                                <CreditCard className="w-2.5 h-2.5" />
                                {o.discountPct}% · {o.bankName} ({o.method})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Stock with inline quick + / - adjustment */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs min-w-[2.25rem] text-[#202A24]">
                          {product.stock}
                        </span>

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
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-[#202A24] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#064E36]" />
                        <span>{product.location} Hub</span>
                      </div>
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}
                        />
                        {statusInfo.label}
                      </span>
                    </td>

                    {/* Dynamic Recommended Action Column */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {isLowOrOut ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onInformSupplier?.(product)}
                            className="px-3 py-1.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#C8E8D9]" />
                            <span>Inform Supplier</span>
                          </button>
                        </div>
                      ) : isDeadStock ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onSuggestDeadStockSolutions?.(product)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#FFFBEB] hover:bg-[#F5EBCB] border border-[#E8D58A] text-[#7A5800] text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Suggest Solutions</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPaymentDiscounts?.(product)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#EAF4EC] hover:bg-[#DCEFE3] border border-[#C8E8D9] text-[#064E36] text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Payment Discount</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C877F]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#064E36]" />
                            No action required
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenPaymentDiscounts?.(product)}
                            title="Add bank or payment method discount"
                            className="px-2 py-1 rounded-lg bg-[#FAF9F5] hover:bg-[#EAF4EC] border border-[#E8EBE7] text-[10px] font-bold text-[#064E36] cursor-pointer transition-colors"
                          >
                            + Bank Offer
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Manage: Edit & Delete */}
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
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
        <p className="flex flex-wrap items-center gap-2">
          <span>
            Rule: <strong>Out of Stock</strong> (0)
          </span>
          <span>•</span>
          <span>
            <strong>Low Stock</strong> (1–10 → Inform Supplier)
          </span>
          <span>•</span>
          <span>
            <strong>In Stock</strong> (11–99 → No Action Required)
          </span>
          <span>•</span>
          <span>
            <strong>Dead Stock</strong> (&ge;100 → Solutions &amp; Bank Offers)
          </span>
        </p>
      </div>
    </div>
  );
};
