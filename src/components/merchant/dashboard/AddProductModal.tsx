import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileDown,
  Trash2,
  Check,
  Plus,
  Loader2,
  ArrowRight,
  Layers,
  MapPin,
} from 'lucide-react';
import { Product, ProductCategory } from '../../../types/product';
import {
  parseCSV,
  parseExcel,
  parsePDF,
  generateSampleCSV,
  ParsedProductItem,
} from '../../../utils/fileProductParser';
import { motion, AnimatePresence } from 'framer-motion';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>) => void;
  onAddBulkProducts?: (products: Omit<Product, 'id' | 'createdAt' | 'lastUpdated'>[]) => void;
  preferBulkMode?: boolean;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  onAddBulkProducts,
  preferBulkMode = false,
}) => {
  // Modal Mode: Single manual entry vs Bulk file import (CSV / Excel / PDF)
  const [modalMode, setModalMode] = useState<'single' | 'bulk'>(preferBulkMode ? 'bulk' : 'single');

  // ── Single Product Form State ──
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

  // ── Bulk File Import State ──
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ParsedProductItem[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleImages = [
    { label: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80' },
    { label: 'Earphones', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80' },
    { label: 'Gaming Laptop', url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80' },
    { label: 'Smartphone Pro', url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80' },
  ];

  useEffect(() => {
    if (!isOpen) return;
    setModalMode(preferBulkMode ? 'bulk' : 'single');
    setExtractedProducts([]);
    setUploadedFile(null);
    setBulkError(null);
    setIsProcessingFile(false);
    setErrorMessage(null);
  }, [isOpen, preferBulkMode]);

  if (!isOpen) return null;

  // Single Product Form Submit
  const handleSingleSubmit = (e: React.FormEvent) => {
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

  // Process File Upload (CSV, Excel XLSX/XLS, or PDF)
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
        // Fallback generic parser attempt
        const text = await file.text();
        parsed = parseCSV(text);
      }

      if (parsed.length === 0) {
        setBulkError('No valid product rows were detected. Please check the file columns or download our template.');
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

  // Download Sample CSV Template
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

  // Remove an extracted item from the preview list
  const handleRemoveExtractedItem = (index: number) => {
    setExtractedProducts((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Import All Extracted Products
  const handleImportAllExtracted = () => {
    if (extractedProducts.length === 0) return;

    if (onAddBulkProducts) {
      onAddBulkProducts(extractedProducts);
    } else {
      extractedProducts.forEach((item) => onAddProduct(item));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
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
        transition={{ duration: 0.22 }}
        className={`relative w-full rounded-3xl bg-white border border-[#E8EBE7] shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh] transition-all duration-300 ${
          modalMode === 'bulk' ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#064E36] via-[#65B99B] to-[#E8D58A]" />

        {/* Header with Mode Switcher */}
        <div className="p-5 sm:p-6 border-b border-[#E8EBE7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF9F5]/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCEFE3] text-[#064E36] text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-[#064E36]" />
                Merchant Inventory
              </span>
            </div>
            <h2 className="font-display font-black text-xl text-[#202A24] tracking-tight">
              Add Products to Catalog
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Pill Switcher: Single vs Bulk Import */}
            <div className="flex items-center p-1 rounded-xl bg-white border border-[#E8EBE7] shadow-2xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalMode('single')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  modalMode === 'bulk'
                    ? 'bg-[#064E36] text-white shadow-xs'
                    : 'text-[#7C877F] hover:text-[#202A24]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk Import (CSV / Excel / PDF)</span>
              </button>
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
        </div>

        {/* ════════════════════════════ MODE 1: SINGLE PRODUCT FORM ════════════════════════════ */}
        {modalMode === 'single' && (
          <form onSubmit={handleSingleSubmit} className="p-6 overflow-y-auto space-y-4">
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
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
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
                  placeholder="https://..."
                  className="flex-1 px-4 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-mono text-[#202A24] outline-none focus:border-[#064E36]"
                />
                {image && (
                  <div className="w-10 h-10 rounded-xl border border-[#E8EBE7] p-1 bg-white shrink-0">
                    <img src={image} alt="Preview" className="w-full h-full object-contain mix-blend-multiply" />
                  </div>
                )}
              </div>

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
        )}

        {/* ════════════════════════════ MODE 2: BULK IMPORT (CSV / EXCEL / PDF) ════════════════════════════ */}
        {modalMode === 'bulk' && (
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Supported Formats Banner & Quick Template Download */}
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

            {/* Drag & Drop Zone */}
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

            {/* Extracted Products Preview Table */}
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

                {/* Import Footer Actions */}
                <div className="pt-3 border-t border-[#E8EBE7] flex items-center justify-between gap-3">
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

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
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
