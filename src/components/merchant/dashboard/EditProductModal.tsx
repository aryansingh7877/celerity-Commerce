import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  AlertCircle,
  Save,
  Upload,
  Trash2,
  Plus,
  FileText,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Product, ProductCategory } from '../../../types/product';
import { ProductImageSlot } from './AddProductModal';
import { motion } from 'framer-motion';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProduct: (updated: Product) => void;
}

function buildImageSlotsFromProduct(product: Product): ProductImageSlot[] {
  const existingUrls =
    product.images && product.images.length > 0
      ? product.images.filter(Boolean)
      : product.image
        ? [product.image]
        : [];

  const totalSlots = Math.max(4, existingUrls.length);
  return Array.from({ length: totalSlots }).map((_, idx) => ({
    id: `edit-img-slot-${idx + 1}`,
    title: idx === 0 ? 'Primary Image' : `Image ${idx + 1}`,
    required: idx === 0,
    url: existingUrls[idx] || '',
  }));
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  isOpen,
  onClose,
  onUpdateProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'images'>('details');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Headphones');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number | ''>(0);
  const [stock, setStock] = useState<number | ''>(0);
  const [location, setLocation] = useState<'Bangalore' | 'Mumbai' | 'Delhi'>('Bangalore');
  const [description, setDescription] = useState('');
  const [imageSlots, setImageSlots] = useState<ProductImageSlot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product && isOpen) {
      setName(product.name);
      setCategory(product.category);
      setSku(product.sku);
      setPrice(product.price);
      setStock(product.stock);
      setLocation(product.location === 'Bengaluru' ? 'Bangalore' : product.location);
      setDescription(product.description);
      setImageSlots(buildImageSlotsFromProduct(product));
      setActiveTab('details');
      setErrorMessage(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const filledImageUrls = imageSlots
    .map((slot) => slot.url.trim())
    .filter((url) => url.length > 0);

  const handleSlotUrlChange = (slotId: string, newUrl: string) => {
    setErrorMessage(null);
    setImageSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, url: newUrl, dimensions: undefined } : slot
      )
    );

    const trimmed = newUrl.trim();
    if (!trimmed) return;

    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth || 1000;
      const h = img.naturalHeight || 1000;
      setImageSlots((prev) =>
        prev.map((slot) =>
          slot.id === slotId ? { ...slot, dimensions: `${w} × ${h} px` } : slot
        )
      );
    };
    img.src = trimmed;
  };

  const handleSlotFileUpload = (slotId: string, file: File | undefined) => {
    if (!file) return;
    setErrorMessage(null);

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const origW = img.naturalWidth;
        const origH = img.naturalHeight;

        const MAX_DIM = 900;
        let targetW = origW;
        let targetH = origH;
        if (origW > MAX_DIM || origH > MAX_DIM) {
          if (origW >= origH) {
            targetW = MAX_DIM;
            targetH = Math.round((origH * MAX_DIM) / origW);
          } else {
            targetH = MAX_DIM;
            targetW = Math.round((origW * MAX_DIM) / origH);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        let finalUrl = dataUrl;
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetW, targetH);
          finalUrl = canvas.toDataURL('image/jpeg', 0.85);
        }

        setImageSlots((prev) =>
          prev.map((slot) =>
            slot.id === slotId
              ? {
                  ...slot,
                  url: finalUrl,
                  dimensions: `${origW} × ${origH} px`,
                }
              : slot
          )
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleAddExtraImageSlot = () => {
    setImageSlots((prev) => {
      const nextNum = prev.length + 1;
      return [
        ...prev,
        {
          id: `edit-img-slot-${Date.now()}-${nextNum}`,
          title: `Image ${nextNum}`,
          required: false,
          url: '',
        },
      ];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setActiveTab('details');
      setErrorMessage('Please enter a product name.');
      return;
    }
    if (!sku.trim()) {
      setActiveTab('details');
      setErrorMessage('Please provide a SKU code.');
      return;
    }
    if (price === '' || Number(price) < 0) {
      setActiveTab('details');
      setErrorMessage('Please provide a valid price.');
      return;
    }
    if (stock === '' || Number(stock) < 0) {
      setActiveTab('details');
      setErrorMessage('Stock quantity cannot be negative.');
      return;
    }
    if (filledImageUrls.length < 1) {
      setActiveTab('images');
      setErrorMessage('Please keep or upload at least 1 product image.');
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
      image: filledImageUrls[0],
      images: filledImageUrls,
      description: description.trim(),
      lastUpdated: new Date().toISOString(),
    });

    onClose();
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
        transition={{ duration: 0.24 }}
        className="relative w-full max-w-2xl rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#064E36] via-[#65B99B] to-[#E8D58A]" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8EBE7] flex items-center justify-between gap-4 bg-[#FAF9F5]/50">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF4EC] text-[#064E36] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <Edit2 className="w-3 h-3 text-[#064E36]" />
              Modify Catalog SKU
            </span>
            <h2 className="font-display font-black text-lg sm:text-xl text-[#202A24] tracking-tight whitespace-nowrap">
              Edit Product Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 rounded-full hover:bg-white text-[#7C877F] hover:text-[#202A24] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Sub-Tab Bar: 1. Product Details | 2. Product Images */}
          <div className="px-6 pt-3 pb-0 bg-[#FAF9F5] border-b border-[#E8EBE7] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setActiveTab('details');
                }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'details'
                    ? 'border-[#064E36] text-[#064E36] bg-white'
                    : 'border-transparent text-[#7C877F] hover:text-[#202A24]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>1. Product Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setActiveTab('images');
                }}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'images'
                    ? 'border-[#064E36] text-[#064E36] bg-white'
                    : 'border-transparent text-[#7C877F] hover:text-[#202A24]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>2. Product Images</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    filledImageUrls.length >= 1
                      ? 'bg-[#DCEFE3] text-[#064E36]'
                      : 'bg-[#F5EBCB] text-[#7A5800]'
                  }`}
                >
                  {filledImageUrls.length}/{imageSlots.length}
                </span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-[#7C877F] pb-2 truncate">
              SKU: {sku || product.sku}
            </span>
          </div>

          {/* Scrollable Tab Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ── TAB 1: PRODUCT DETAILS ── */}
            {activeTab === 'details' && (
              <div className="space-y-4">
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
                        new Set(
                          [
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
                          ].filter(Boolean)
                        )
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
                      onChange={(e) =>
                        setPrice(e.target.value === '' ? '' : Number(e.target.value))
                      }
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
                      onChange={(e) =>
                        setStock(e.target.value === '' ? '' : Number(e.target.value))
                      }
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
                    Product Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs text-[#202A24] resize-none"
                  />
                </div>
              </div>
            )}

            {/* ── TAB 2: PRODUCT IMAGES (4+ Slots, Clean Grid) ── */}
            {activeTab === 'images' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs">
                  <span className="text-[#202A24] font-medium">
                    <strong className="text-[#064E36]">Dimensions:</strong> 1000 × 1000 px (1:1 Square, min 800 × 800 px) · PNG, JPG, WEBP · <strong className="text-[#202A24]">Min 1 required</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddExtraImageSlot}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-[#064E36] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Slot
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {imageSlots.map((slot) => {
                    const hasImage = slot.url.trim().length > 0;
                    return (
                      <div
                        key={slot.id}
                        className={`rounded-2xl border p-3 space-y-2 transition-all ${
                          hasImage
                            ? 'bg-white border-[#65B99B]'
                            : 'bg-[#FAF9F5]/70 border-[#E8EBE7]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#202A24] flex items-center gap-1.5">
                            {slot.title}
                            {slot.required && (
                              <span className="px-1.5 py-0.5 rounded bg-[#EAF4EC] text-[#064E36] text-[9px] font-extrabold uppercase">
                                Required *
                              </span>
                            )}
                          </span>

                          {hasImage && (
                            <button
                              type="button"
                              onClick={() => handleSlotUrlChange(slot.id, '')}
                              className="text-[#7C877F] hover:text-red-600 p-1 rounded cursor-pointer"
                              title="Remove image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {hasImage ? (
                          <div className="relative h-28 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] p-2 flex items-center justify-center overflow-hidden">
                            <img
                              src={slot.url}
                              alt={slot.title}
                              className="w-full h-full object-contain"
                            />
                            {slot.dimensions && (
                              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-white/90 border border-[#E8EBE7] text-[9px] font-mono font-bold text-[#064E36]">
                                {slot.dimensions}
                              </span>
                            )}
                          </div>
                        ) : (
                          <label className="h-28 rounded-xl border border-dashed border-[#C8E8D9] hover:border-[#064E36] bg-white flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={(e) =>
                                handleSlotFileUpload(slot.id, e.target.files?.[0])
                              }
                              className="hidden"
                            />
                            <Upload className="w-4 h-4 text-[#064E36] mb-1" />
                            <span className="text-xs font-bold text-[#202A24]">
                              Upload Image
                            </span>
                            <span className="text-[10px] text-[#7C877F]">
                              1000 × 1000 px
                            </span>
                          </label>
                        )}

                        <input
                          type="url"
                          value={slot.url.startsWith('data:') ? '' : slot.url}
                          onChange={(e) => handleSlotUrlChange(slot.id, e.target.value)}
                          placeholder={
                            slot.url.startsWith('data:')
                              ? 'Uploaded file'
                              : 'Or paste image URL (https://...)'
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E8EBE7] text-[11px] text-[#202A24] placeholder:text-[#7C877F] outline-none focus:border-[#064E36]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#E8EBE7] bg-[#FAF9F5]/60 flex items-center justify-between gap-3">
            <div>
              {activeTab === 'images' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-4 py-2.5 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#202A24] hover:bg-[#FAF9F5] flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Details
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  className="px-4 py-2.5 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#064E36] hover:bg-[#EAF4EC] flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Edit Images ({filledImageUrls.length}/{imageSlots.length})
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#7C877F] hover:text-[#202A24] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
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
          </div>
        </form>
      </motion.div>
    </div>
  );
};
