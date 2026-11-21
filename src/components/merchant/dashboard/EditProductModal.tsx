import React, { useState, useEffect } from 'react';
import { X, Edit2, AlertCircle, Save } from 'lucide-react';
import { Product, ProductCategory } from '../../../types/product';
import { motion } from 'framer-motion';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct: (updated: Product) => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Headphones');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number | ''>(0);
  const [stock, setStock] = useState<number | ''>(0);
  const [location, setLocation] = useState<'Bangalore' | 'Mumbai' | 'Delhi' | 'Bengaluru'>('Bangalore');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setSku(product.sku);
      setPrice(product.price);
      setStock(product.stock);
      setLocation(product.location);
      setImage(product.image);
      setDescription(product.description);
      setErrorMessage(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

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

    onUpdateProduct({
      ...product,
      name: name.trim(),
      category,
      sku: sku.trim().toUpperCase(),
      price: Number(price),
      stock: Number(stock),
      location,
      image: image.trim() || product.image,
      description: description.trim(),
      lastUpdated: new Date().toISOString(),
    });

    onClose();
  };

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
        transition={{ duration: 0.24 }}
        className="relative w-full max-w-xl rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#064E36] via-[#65B99B] to-[#E8D58A]" />

        <div className="p-6 border-b border-[#E8EBE7] flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF4EC] text-[#064E36] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <Edit2 className="w-3 h-3 text-[#064E36]" />
              Modify Catalog SKU
            </span>
            <h2 className="font-display font-black text-xl text-[#202A24] tracking-tight">
              Edit Product Details
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

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm text-[#202A24]"
            />
          </div>

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
                {Array.from(
                  new Set([
                    category,
                    'Headphones',
                    'Earphones',
                    'Laptops',
                    'Smartphones',
                    'Top Load',
                    'Front Load',
                    'Semi-Automatic',
                    'Front Load Washer Dryer',
                    'Washing Machines',
                  ].filter(Boolean))
                ).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
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
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-sm font-mono text-[#202A24]"
              />
            </div>
          </div>

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
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-sm font-mono font-bold text-[#064E36]"
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
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-sm font-mono font-bold text-[#202A24]"
              />
            </div>
          </div>

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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
              Product Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-mono text-[#202A24] outline-none focus:border-[#064E36]"
              />
              {image && (
                <div className="w-10 h-10 rounded-xl border border-[#E8EBE7] p-1 bg-white shrink-0">
                  <img src={image} alt="Preview" className="w-full h-full object-contain mix-blend-multiply" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
              Product Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs text-[#202A24] resize-none"
            />
          </div>

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
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
