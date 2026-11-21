import React from 'react';
import { Edit2, Trash2, Plus, Minus, MapPin, Eye } from 'lucide-react';
import { Product, StockStatus } from '../../../types/product';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAdjustStock: (productId: string, delta: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onAdjustStock,
}) => {
  const getStockStatus = (stock: number): { label: string; status: StockStatus; badgeClass: string } => {
    if (stock > 10) {
      return {
        label: 'In Stock',
        status: 'in_stock',
        badgeClass: 'bg-[#DCEFE3] text-[#064E36] border-[#064E36]/20',
      };
    }
    if (stock >= 1) {
      return {
        label: 'Low Stock',
        status: 'low_stock',
        badgeClass: 'bg-[#F5EBCB] text-[#103C2D] border-[#E8D58A]',
      };
    }
    return {
      label: 'Out of Stock',
      status: 'out_of_stock',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    };
  };

  const status = getStockStatus(product.stock);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border border-[#E8EBE7] p-5 flex flex-col justify-between hover:border-[#064E36]/30 hover:shadow-md transition-all group shadow-2xs"
    >
      <div>
        {/* Top Header: Category & Stock Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C877F] bg-[#FAF9F5] px-2.5 py-0.5 rounded-full border border-[#E8EBE7]">
            {product.category}
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${status.badgeClass}`}>
            {status.label}
          </span>
        </div>

        {/* Clean Centered Product Image inspired by Shopcart */}
        <div className="relative w-full h-44 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7]/60 flex items-center justify-center p-3 mb-4 overflow-hidden group-hover:bg-[#EAF4EC]/30 transition-colors">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {/* Quick SKU tag */}
          <span className="absolute bottom-2 left-2 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/90 backdrop-blur-xs border border-[#E8EBE7] text-[#202A24]">
            {product.sku}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-display font-bold text-base text-[#202A24] tracking-tight group-hover:text-[#064E36] transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-[#7C877F] mt-1 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Price & Location */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E8EBE7]">
          <div>
            <span className="text-[10px] text-[#7C877F] block uppercase font-bold">Price</span>
            <span className="font-display font-extrabold text-lg text-[#064E36]">
              ₹{product.price.toLocaleString()}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#7C877F] block uppercase font-bold">Hub Location</span>
            <span className="text-xs font-semibold text-[#202A24] flex items-center gap-1 justify-end">
              <MapPin className="w-3 h-3 text-[#064E36]" />
              {product.location}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Controls: Quick Stock Adjustment & Edit/Delete */}
      <div className="mt-4 pt-3 border-t border-[#E8EBE7] flex items-center justify-between gap-2">
        {/* Stock Stepper */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F5] p-1 rounded-xl border border-[#E8EBE7]">
          <button
            type="button"
            onClick={() => onAdjustStock(product.id, -1)}
            disabled={product.stock <= 0}
            title="Decrease stock"
            aria-label={`Decrease stock for ${product.name}`}
            className="w-6 h-6 rounded-lg bg-white border border-[#E8EBE7] flex items-center justify-center text-[#202A24] hover:bg-[#EAF4EC] hover:text-[#064E36] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-mono font-bold text-xs px-2 text-[#202A24] min-w-[28px] text-center">
            {product.stock}
          </span>
          <button
            type="button"
            onClick={() => onAdjustStock(product.id, 1)}
            title="Increase stock"
            aria-label={`Increase stock for ${product.name}`}
            className="w-6 h-6 rounded-lg bg-white border border-[#E8EBE7] flex items-center justify-center text-[#202A24] hover:bg-[#EAF4EC] hover:text-[#064E36] cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Edit & Delete Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(product)}
            title="Edit details"
            className="p-2 rounded-xl bg-white border border-[#E8EBE7] hover:border-[#064E36] hover:bg-[#EAF4EC] text-[#202A24] hover:text-[#064E36] transition-colors cursor-pointer shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(product)}
            title="Delete product"
            className="p-2 rounded-xl bg-white border border-[#E8EBE7] hover:border-red-300 hover:bg-red-50 text-[#7C877F] hover:text-red-600 transition-colors cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
