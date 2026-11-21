import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Product } from '../../../types/product';
import { motion } from 'framer-motion';

interface DeleteConfirmationProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#101413]/60 backdrop-blur-xs"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl z-10 overflow-hidden p-6 sm:p-7 text-center"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#FAF9F5] text-[#7C877F] hover:text-[#202A24] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4 text-red-600">
          <Trash2 className="w-7 h-7 stroke-[2.2]" />
        </div>

        <h3 className="font-display font-black text-xl text-[#202A24] tracking-tight mb-2">
          Delete Product?
        </h3>

        <p className="text-xs text-[#7C877F] leading-relaxed mb-6">
          Are you sure you want to remove <span className="font-bold text-[#202A24]">{product.name}</span> (SKU: <span className="font-mono font-semibold">{product.sku}</span>) from the active inventory catalog? This action will remove its available stock ({product.stock} units) across all hubs.
        </p>

        <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center gap-3 text-left mb-6">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8EBE7] p-1 shrink-0 overflow-hidden">
            <img src={product.image} alt="" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#202A24] truncate">{product.name}</p>
            <p className="text-[11px] text-[#064E36] font-mono font-bold">
              ₹{product.price.toLocaleString()} • {product.stock} units
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#7C877F] hover:text-[#202A24] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-display font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            Yes, Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};
