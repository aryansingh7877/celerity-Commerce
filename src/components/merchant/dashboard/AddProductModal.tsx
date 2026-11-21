import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileDown,
  Trash2,
  Plus,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { Product, ProductCategory } from '../../../types/product';
import {
  parseCSV,
  parseExcel,
  parsePDF,
  generateSampleCSV,
  ParsedProductItem,
} from '../../../utils/fileProductParser';
import { motion } from 'framer-motion';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) => void;
  onAddBulkProducts?: (
    products: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>[],
    replaceExisting?: boolean
  ) => void;
  preferBulkMode?: boolean;
}

export interface ProductImageSlot {
  id: string;
  title: string;
  required: boolean;
  url: string;
  dimensions?: string;
}

const createDefaultImageSlots = (): ProductImageSlot[] => [
  {
    id: 'img-slot-1',
    title: 'Primary Image',
    required: true,
    url: '',
  },
  {
    id: 'img-slot-2',
    title: 'Image 2',
    required: false,
    url: '',
  },
  {
    id: 'img-slot-3',
    title: 'Image 3',
    required: false,
    url: '',
  },
  {
    id: 'img-slot-4',
    title: 'Image 4',
    required: false,
    url: '',
  },
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  onAddBulkProducts,
  preferBulkMode = false,
}) => {
  const [modalMode, setModalMode] = useState<'single' | 'bulk'>(
    preferBulkMode ? 'bulk' : 'single'
  );
  const [singleTab, setSingleTab] = useState<'details' | 'images'>('details');

  // ── Single Product Form State (Always starts empty) ──
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Headphones');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [location, setLocation] = useState<'Bangalore' | 'Mumbai' | 'Delhi'>('Bangalore');
  const [description, setDescription] = useState('');
  const [imageSlots, setImageSlots] = useState<ProductImageSlot[]>(() =>
    createDefaultImageSlots()
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Bulk File Import State ──
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ParsedProductItem[]>([]);
  const [replaceExistingOnBulk, setReplaceExistingOnBulk] = useState(true);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAllFields = () => {
    setName('');
    setCategory('Headphones');
    setSku('');
    setPrice('');
    setStock('');
    setLocation('Bangalore');
    setDescription('');
    setImageSlots(createDefaultImageSlots());
    setSingleTab('details');
    setErrorMessage(null);
    setExtractedProducts([]);
    setUploadedFile(null);
    setBulkError(null);
    setIsProcessingFile(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetAllFields();
      setModalMode(preferBulkMode ? 'bulk' : 'single');
    }
  }, [isOpen, preferBulkMode]);

  if (!isOpen) return null;

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
          id: `img-slot-${Date.now()}-${nextNum}`,
          title: `Image ${nextNum}`,
          required: false,
          url: '',
        },
      ];
    });
  };

  const validateDetailsTab = (): boolean => {
    if (!name.trim()) {
      setErrorMessage('Please enter a Product Name.');
      setSingleTab('details');
      return false;
    }
    if (!sku.trim()) {
      setErrorMessage('Please provide a SKU Identifier.');
      setSingleTab('details');
      return false;
    }
    if (price === '' || Number(price) < 0) {
      setErrorMessage('Please enter a valid Price (INR ₹).');
      setSingleTab('details');
      return false;
    }
    if (stock === '' || Number(stock) < 0) {
      setErrorMessage('Please enter a valid Available Stock Quantity.');
      setSingleTab('details');
      return false;
    }
    return true;
  };

  const handleGoToImagesTab = () => {
    setErrorMessage(null);
    if (!validateDetailsTab()) return;
    setSingleTab('images');
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateDetailsTab()) return;

    if (filledImageUrls.length < 1) {
      setSingleTab('images');
      setErrorMessage('Please upload or paste at least 1 product image.');
      return;
    }

    onAddProduct({
      name: name.trim(),
      category,
      sku: sku.trim().toUpperCase(),
      price: Number(price),
      stock: Number(stock),
      location,
      image: filledImageUrls[0],
      images: filledImageUrls,
      description:
        description.trim() || `${name.trim()} — ${category} (${sku.trim().toUpperCase()})`,
    });

    resetAllFields();
    onClose();
  };

  const processUploadedFile = async (file: File) => {
    setBulkError(null);
    setIsProcessingFile(true);
    setUploadedFile(file);

    try {
      const fileName = file.name.toLowerCase();
      let parsed: ParsedProductItem[] = [];

      if (fileName.endsWith('.csv') || file.type.includes('csv')) {
        const text = await file.text();
        parsed = parseCSV(text);
      } else if (
        fileName.endsWith('.xlsx') ||
        fileName.endsWith('.xls') ||
        file.type.includes('spreadsheet') ||
        file.type.includes('excel')
      ) {
        parsed = await parseExcel(file);
      } else if (fileName.endsWith('.pdf') || file.type.includes('pdf')) {
        parsed = await parsePDF(file);
      } else {
        const text = await file.text();
        parsed = parseCSV(text);
      }

      if (parsed.length === 0) {
        setBulkError(
          'No valid product rows were detected. Please check the file columns or download our template.'
        );
      } else {
        setExtractedProducts(parsed);
      }
    } catch (err: any) {
      setBulkError(err?.message || 'Error parsing file. Please verify file format.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'celerity_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemoveExtractedItem = (index: number) => {
    setExtractedProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleImportAllExtracted = () => {
    if (extractedProducts.length === 0) return;

    if (onAddBulkProducts) {
      onAddBulkProducts(extractedProducts, replaceExistingOnBulk);
    } else {
      extractedProducts.forEach((item) => onAddProduct(item));
    }

    resetAllFields();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          resetAllFields();
          onClose();
        }}
        className="fixed inset-0 bg-[#101413]/60 backdrop-blur-xs"
      />

      {/* Modal Dialog — wider max-w-2xl so header and tabs stay cleanly on a single line */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22 }}
        className={`relative w-full rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300 ${
          modalMode === 'bulk' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#064E36] via-[#65B99B] to-[#E8D58A]" />

        {/* Single-Line Header with Single-Line Mode Switcher */}
        <div className="px-6 py-4 border-b border-[#E8EBE7] flex items-center justify-between gap-4 bg-[#FAF9F5]/50">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCEFE3] text-[#064E36] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-[#064E36]" />
              Merchant Inventory
            </span>
            <h2 className="font-display font-black text-lg sm:text-xl text-[#202A24] tracking-tight whitespace-nowrap">
              Add Products to Catalog
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Single-Line Pill Switcher: Single Item vs Bulk Import */}
            <div className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E8EBE7] shadow-2xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalMode('single')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  modalMode === 'single'
                    ? 'bg-[#064E36] text-white shadow-xs'
                    : 'text-[#7C877F] hover:text-[#202A24]'
                }`}
              >
                Single Item
              </button>
              <button
                type="button"
                onClick={() => setModalMode('bulk')}
                className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  modalMode === 'bulk'
                    ? 'bg-[#064E36] text-white shadow-xs'
                    : 'text-[#7C877F] hover:text-[#202A24]'
                }`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Bulk Import (CSV / Excel / PDF)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                resetAllFields();
                onClose();
              }}
              aria-label="Close modal"
              className="p-2 rounded-full hover:bg-white text-[#7C877F] hover:text-[#202A24] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ════════════════════════════ MODE 1: SINGLE PRODUCT FORM ════════════════════════════ */}
        {modalMode === 'single' && (
          <form onSubmit={handleSingleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Sub-Tab Bar: 1. Product Details | 2. Product Images */}
            <div className="px-6 pt-3 pb-0 bg-[#FAF9F5] border-b border-[#E8EBE7] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSingleTab('details');
                  }}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    singleTab === 'details'
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
                    setSingleTab('images');
                  }}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    singleTab === 'images'
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

              <button
                type="button"
                onClick={resetAllFields}
                className="text-[11px] font-bold text-[#7C877F] hover:text-[#064E36] pb-2 cursor-pointer whitespace-nowrap"
              >
                Clear Form
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ── SUB-TAB 1: PRODUCT DETAILS (Clean form without extra bottom card) ── */}
              {singleTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter product name (e.g. Sony WH-1000XM5 Wireless Headphones)"
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm text-[#202A24] placeholder-[#7C877F] transition-all"
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
                        <option value="Headphones">Headphones</option>
                        <option value="Earphones">Earphones</option>
                        <option value="Laptops">Laptops</option>
                        <option value="Smartphones">Smartphones</option>
                        <option value="Washing Machines">Washing Machines</option>
                        <option value="Top Load">Top Load</option>
                        <option value="Front Load">Front Load</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                        SKU Identifier *
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g. AUD-005 or LAP-ASU-001"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm font-mono text-[#202A24] placeholder-[#7C877F]"
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
                        value={price}
                        onChange={(e) =>
                          setPrice(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="Enter price in ₹ (e.g. 24990)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm font-mono font-bold text-[#064E36] placeholder:font-normal placeholder:text-[#7C877F]"
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
                        value={stock}
                        onChange={(e) =>
                          setStock(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="Enter stock units (e.g. 15)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-sm font-mono font-bold text-[#202A24] placeholder:font-normal placeholder:text-[#7C877F]"
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
                      placeholder="Provide technical specifications, acoustics, or warranty details..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] focus:ring-2 focus:ring-[#064E36]/15 outline-none text-xs text-[#202A24] placeholder-[#7C877F] transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ── SUB-TAB 2: PRODUCT IMAGES (Clean, Uncluttered Interface) ── */}
              {singleTab === 'images' && (
                <div className="space-y-4">
                  {/* Compact 1-Line Specification Bar */}
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

                  {/* Clean 2x2 Image Slots Grid */}
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

            {/* Footer Controls */}
            <div className="px-6 py-4 border-t border-[#E8EBE7] bg-[#FAF9F5]/60 flex items-center justify-between gap-3">
              <div>
                {singleTab === 'images' ? (
                  <button
                    type="button"
                    onClick={() => setSingleTab('details')}
                    className="px-4 py-2.5 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#202A24] hover:bg-[#FAF9F5] flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Details
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-[#7C877F]">
                    Step 1 of 2 · Product Info
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    resetAllFields();
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#7C877F] hover:text-[#202A24] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {singleTab === 'details' ? (
                  <button
                    type="button"
                    onClick={handleGoToImagesTab}
                    className="px-5 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-display font-bold shadow-md shadow-[#064E36]/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next: Product Images ({filledImageUrls.length}/{imageSlots.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-display font-bold shadow-md shadow-[#064E36]/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C8E8D9]" />
                    <span>Add to Inventory</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* ════════════════════════════ MODE 2: BULK IMPORT (CSV / EXCEL / PDF) ════════════════════════════ */}
        {modalMode === 'bulk' && (
          <div className="p-6 overflow-y-auto space-y-5">
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-bold text-xs uppercase tracking-wider text-[#202A24]">
                    Supported Document Formats:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#DCEFE3] text-[#064E36] font-mono text-[10px] font-extrabold">
                      CSV
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#EAF4EC] text-[#103C2D] font-mono text-[10px] font-extrabold">
                      Excel (XLSX, XLS)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F5EBCB] text-[#103C2D] font-mono text-[10px] font-extrabold">
                      PDF Document
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-[#7C877F]">
                  Upload supplier manifests, distributor spreadsheets, or purchase invoices.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EAF4EC] border border-[#E8EBE7] text-xs font-bold text-[#064E36] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Template (.CSV)</span>
                </button>
              </div>
            </div>

            {bulkError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 rounded-2xl border-2 border-dashed transition-all duration-200 text-center cursor-pointer ${
                isDragging
                  ? 'border-[#064E36] bg-[#DCEFE3]/30 scale-[0.99]'
                  : 'border-[#E8EBE7] bg-[#FAF9F5]/60 hover:bg-[#FAF9F5] hover:border-[#064E36]/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8EBE7] flex items-center justify-center mx-auto mb-3 text-[#064E36] shadow-xs">
                {isProcessingFile ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#064E36]" />
                ) : (
                  <Upload className="w-6 h-6 stroke-[2]" />
                )}
              </div>

              <h4 className="font-display font-bold text-sm text-[#202A24]">
                {isProcessingFile
                  ? 'Analyzing and parsing document...'
                  : 'Drop your CSV, Excel, or PDF file here, or click to browse'}
              </h4>
              <p className="text-xs text-[#7C877F] mt-1">
                Supports .csv, .xlsx, .xls, and .pdf documents up to 25MB
              </p>
            </div>

            {extractedProducts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#064E36]" />
                    <h3 className="font-display font-bold text-sm text-[#202A24]">
                      Parsed Products Ready to Import ({extractedProducts.length})
                    </h3>
                  </div>

                  {uploadedFile && (
                    <span className="text-[11px] font-mono text-[#7C877F]">
                      Source: {uploadedFile.name}
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-[#E8EBE7] overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAF9F5] border-b border-[#E8EBE7] text-[10px] font-extrabold uppercase text-[#7C877F] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-2">SKU</th>
                        <th className="py-2.5 px-2">Category</th>
                        <th className="py-2.5 px-2">Price</th>
                        <th className="py-2.5 px-2">Stock</th>
                        <th className="py-2.5 px-2">Hub</th>
                        <th className="py-2.5 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EBE7] bg-white">
                      {extractedProducts.map((item, idx) => (
                        <tr key={`${item.sku}-${idx}`} className="hover:bg-[#FAF9F5]/70">
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-md bg-[#FAF9F5] border border-[#E8EBE7] p-0.5 shrink-0 overflow-hidden">
                                <img
                                  src={item.image}
                                  alt=""
                                  className="w-full h-full object-contain mix-blend-multiply"
                                />
                              </div>
                              <span className="font-bold text-[#202A24] truncate max-w-[160px]">
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2 font-mono font-semibold text-[#202A24]">
                            {item.sku}
                          </td>
                          <td className="py-2 px-2 text-[#7C877F]">{item.category}</td>
                          <td className="py-2 px-2 font-mono font-bold text-[#064E36]">
                            ₹{item.price.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 font-mono font-bold">{item.stock}</td>
                          <td className="py-2 px-2 text-[#7C877F]">{item.location}</td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveExtractedItem(idx)}
                              title="Remove item"
                              className="p-1 rounded text-[#7C877F] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-3 border-t border-[#E8EBE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#202A24] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replaceExistingOnBulk}
                        onChange={(e) => setReplaceExistingOnBulk(e.target.checked)}
                        className="rounded border-[#E8EBE7] accent-[#064E36]"
                      />
                      <span>Replace existing catalog</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setExtractedProducts([]);
                        setUploadedFile(null);
                      }}
                      className="text-xs font-semibold text-[#7C877F] hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Clear File
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetAllFields();
                        onClose();
                      }}
                      className="px-4 py-2 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#7C877F] hover:text-[#202A24] hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleImportAllExtracted}
                      className="px-5 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-display font-bold shadow-md shadow-[#064E36]/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 text-[#C8E8D9]" />
                      <span>Import All ({extractedProducts.length}) to Inventory</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
