import React, { useState } from 'react';
import { X, Upload, Sparkles, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Product, ProductCategory } from '../../../types/product';
import { motion, AnimatePresence } from 'framer-motion';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Headphones');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number | ''>(2499);
  const [stock, setStock] = useState<number | ''>(20);
  const [location, setLocation] = useState<'Bangalore' | 'Mumbai' | 'Delhi'>('Bangalore');
  const [image, setImage] = useState(
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'
  );
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Curated sample images to make it super quick and seamless for merchants to pick realistic images
  const sampleImages = [
    { label: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
    { label: 'Earphones', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80' },
    { label: 'Gaming Laptop', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80' },
    { label: 'Smartphone Pro', url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80' },
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter a product name.');
      return;
    }
    if (!sku.trim()) {
      setErrorMessage('Please provide a SKU code.');
      return;
    }
    if (price === '' || price < 0) {
      setErrorMessage('Please provide a valid price.');
      return;
    }
    if (stock === '' || stock < 0) {
      setErrorMessage('Stock quantity cannot be negative.');
      return;
    }

    onAddProduct({
      name: name.trim(),
      category,
      sku: sku.trim().toUpperCase(),
      price: Number(price),
      stock: Number(stock),
      location,
      image: image.trim(),
      description: description.trim() || `${name.trim()} - Premium commerce inventory.`,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#101413]/60 backdrop-blur-xs"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.24 }}
        className="relative w-full max-w-xl rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#064E36] via-[#65B99B] to-[#E8D58A]" />

        {/* Header */}
        <div className="p-6 border-b border-[#E8EBE7] flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCEFE3] text-[#064E36] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-[#064E36]" />
              Merchant Inventory
            </span>
            <h2 className="font-display font-black text-xl text-[#202A24] tracking-tight">
              Add New Product
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-full hover:bg-[#FAF9F5] text-[#7C877F] hover:text-[#202A24] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm text-[#202A24] placeholder-[#7C877F] transition-all"
            />
          </div>

          {/* Grid: Category & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-sm font-semibold text-[#202A24]"
              >
                <option value="Headphones">Headphones</option>
                <option value="Earphones">Earphones</option>
                <option value="Laptops">Laptops</option>
                <option value="Smartphones">Smartphones</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                SKU Identifier *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. AUD-005"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm font-mono text-[#202A24]"
              />
            </div>
          </div>

          {/* Grid: Price & Initial Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                Price (INR ₹) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2499"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm font-mono font-bold text-[#064E36]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                Available Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="20"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm font-mono font-bold text-[#202A24]"
              />
            </div>
          </div>

          {/* Store Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
              Assigned Fulfillment Hub *
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-sm font-semibold text-[#202A24]"
            >
              <option value="Bangalore">Bangalore Primary Hub</option>
              <option value="Mumbai">Mumbai Central Logistics</option>
              <option value="Delhi">Delhi NCR Hub</option>
            </select>
          </div>

          {/* Product Image URL & Preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
              Product Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-4 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-mono text-[#202A24] outline-none focus:border-[#064E36]"
              />
              {image && (
                <div className="w-10 h-10 rounded-xl border border-[#E8EBE7] p-1 bg-white shrink-0">
                  <img src={image} alt="Preview" className="w-full h-full object-contain mix-blend-multiply" />
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-[#7C877F] font-bold">Quick Presets:</span>
              {sampleImages.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setImage(s.url)}
                  className="px-2 py-0.5 rounded-md bg-[#FAF9F5] hover:bg-[#DCEFE3] border border-[#E8EBE7] text-[10px] font-semibold text-[#202A24] cursor-pointer transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
              Product Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide technical specifications, acoustics, or warranty details..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-xs text-[#202A24] placeholder-[#7C877F] transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E8EBE7] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#7C877F] hover:text-[#202A24] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-display font-bold shadow-md shadow-[#064E36]/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Add to Inventory</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
