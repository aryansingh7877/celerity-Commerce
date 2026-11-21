import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Phone,
  Copy,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Package,
  Send,
} from 'lucide-react';
import { Product } from '../../../types/product';
import { motion } from 'framer-motion';

interface SupplierContactModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSupplierInfo?: (productId: string, supplierName: string, supplierPhone: string) => void;
}

function getDefaultSupplierForProduct(product: Product): { name: string; phone: string } {
  const brand = (product.name.split(/\s+/)[0] || 'Celerity').trim();
  return {
    name: product.supplierName || `${brand} Authorized India Distributor`,
    phone: product.supplierPhone || '+91 98450 11223',
  };
}

export const SupplierContactModal: React.FC<SupplierContactModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaveSupplierInfo,
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [reorderQty, setReorderQty] = useState<number>(25);
  const [messageText, setMessageText] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      const def = getDefaultSupplierForProduct(product);
      setSupplierName(def.name);
      setSupplierPhone(def.phone);
      const qty = product.stock === 0 ? 30 : 25;
      setReorderQty(qty);
      setMessageText(
        `Hello ${def.name},\n\nUrgent Restock Alert from *Celerity Commerce (${product.location} Hub)*:\nOur stock for *${product.name}* (SKU: *${product.sku}*) is running critically low with only *${product.stock} unit(s)* left.\n\nPlease dispatch a replenishment batch of *${qty} units* to our ${product.location} Hub at the earliest and confirm the delivery ETA.\n\nThank you,\nCelerity Commerce Inventory Operations`
      );
      setCopiedPhone(false);
    }
  }, [product, isOpen]);

  const handleQtyChange = (nextQty: number) => {
    setReorderQty(nextQty);
    if (!product) return;
    setMessageText(
      `Hello ${supplierName || 'Supplier Team'},\n\nUrgent Restock Alert from *Celerity Commerce (${product.location} Hub)*:\nOur stock for *${product.name}* (SKU: *${product.sku}*) is running critically low with only *${product.stock} unit(s)* left.\n\nPlease dispatch a replenishment batch of *${nextQty} units* to our ${product.location} Hub at the earliest and confirm the delivery ETA.\n\nThank you,\nCelerity Commerce Inventory Operations`
    );
  };

  if (!isOpen || !product) return null;

  const cleanPhoneDigits = supplierPhone.replace(/[^0-9]/g, '') || '919845011223';
  const whatsappDigits =
    cleanPhoneDigits.length === 10 ? `91${cleanPhoneDigits}` : cleanPhoneDigits;

  const handleSendWhatsApp = () => {
    if (onSaveSupplierInfo) {
      onSaveSupplierInfo(product.id, supplierName.trim(), supplierPhone.trim());
    }
    const url = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCallSupplier = () => {
    if (onSaveSupplierInfo) {
      onSaveSupplierInfo(product.id, supplierName.trim(), supplierPhone.trim());
    }
    window.location.href = `tel:+${whatsappDigits}`;
  };

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(supplierPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
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
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-xl rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#064E36] via-[#65B99B] to-[#E8D58A]" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8EBE7] flex items-center justify-between gap-4 bg-[#FAF9F5]/60">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5EBCB] text-[#7A5800] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3 h-3" />
              Supplier Replenishment Outreach
            </span>
            <h2 className="font-display font-black text-lg sm:text-xl text-[#202A24] tracking-tight">
              Inform Supplier via WhatsApp or Call
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white text-[#7C877F] hover:text-[#202A24] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Product Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E8EBE7] p-1 shrink-0 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-[#202A24] truncate">
                  {product.name}
                </p>
                <p className="text-xs text-[#7C877F] flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-[#202A24]">{product.sku}</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#064E36]" />
                    {product.location} Hub
                  </span>
                </p>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border shrink-0 ${
                product.stock === 0
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-[#F5EBCB] text-[#7A5800] border-[#E8D58A]'
              }`}
            >
              {product.stock} {product.stock === 1 ? 'Unit' : 'Units'} Left
            </span>
          </div>

          {/* Supplier Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1">
                Supplier / Distributor Name
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-semibold text-[#202A24]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1">
                WhatsApp / Phone Number
              </label>
              <div className="flex gap-1.5">
                <input
                  type="tel"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="+91 98450 11223"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-mono font-bold text-[#202A24]"
                />
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  title="Copy supplier phone number"
                  className="px-2.5 rounded-xl bg-[#FAF9F5] hover:bg-[#EAF4EC] border border-[#E8EBE7] text-[#064E36] flex items-center justify-center cursor-pointer"
                >
                  {copiedPhone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Reorder Batch Size Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-xs font-bold text-[#202A24] flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#064E36]" />
              Requested Restock Quantity:
            </span>
            <div className="flex items-center gap-1.5">
              {[15, 25, 50, 100].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => handleQtyChange(qty)}
                  className={`px-3 py-1 rounded-full text-xs font-extrabold cursor-pointer transition-all ${
                    reorderQty === qty
                      ? 'bg-[#064E36] text-white'
                      : 'bg-[#FAF9F5] hover:bg-[#EAF4EC] text-[#202A24] border border-[#E8EBE7]'
                  }`}
                >
                  +{qty} Units
                </button>
              ))}
            </div>
          </div>

          {/* Pre-Built Editable WhatsApp Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#202A24]">
                Pre-Built WhatsApp Restock Message
              </label>
              <span className="text-[10px] font-semibold text-[#064E36]">
                Editable before sending
              </span>
            </div>
            <textarea
              rows={5}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs text-[#202A24] leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* Footer Actions: WhatsApp & Call */}
        <div className="px-6 py-4 border-t border-[#E8EBE7] bg-[#FAF9F5]/60 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#7C877F] hover:text-[#202A24] cursor-pointer"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCallSupplier}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#EAF4EC] border border-[#064E36]/30 text-xs font-extrabold text-[#064E36] flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Supplier ({supplierPhone})</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-5 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-display font-bold shadow-md shadow-[#064E36]/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#C8E8D9]" />
              <span>Send via WhatsApp</span>
              <Send className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
