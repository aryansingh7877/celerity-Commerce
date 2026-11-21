import React, { useState } from 'react';
import {
  X,
  Lightbulb,
  CreditCard,
  Landmark,
  Percent,
  ArrowRightLeft,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { Product, PaymentDiscountOffer } from '../../../types/product';
import { motion } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEAD STOCK SOLUTIONS & ALTERNATIVES MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface DeadStockSolutionsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyMarkdown: (product: Product, discountPct: number) => void;
  onRebalanceStock: (product: Product, targetStock: number) => void;
  onOpenPaymentDiscounts: (product: Product) => void;
}

export const DeadStockSolutionsModal: React.FC<DeadStockSolutionsModalProps> = ({
  product,
  isOpen,
  onClose,
  onApplyMarkdown,
  onRebalanceStock,
  onOpenPaymentDiscounts,
}) => {
  if (!isOpen || !product) return null;

  const tiedCapital = product.stock * product.price;
  const markdownPrice = Math.round((product.price * 0.88) / 10) * 10;
  const rebalancedStock = Math.max(45, Math.round(product.stock * 0.6));

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
        <div className="h-1.5 bg-gradient-to-r from-[#E5B842] via-[#064E36] to-[#65B99B]" />

        <div className="px-6 py-4 border-b border-[#E8EBE7] flex items-center justify-between gap-4 bg-[#FAF9F5]/60">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5EBCB] text-[#7A5800] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-3 h-3" />
              Dead Stock Liquidation Engine
            </span>
            <h2 className="font-display font-black text-lg sm:text-xl text-[#202A24] tracking-tight">
              Recommended Solutions for Dead Stock
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white text-[#7C877F] hover:text-[#202A24] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Product Summary */}
          <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#E8D58A] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E8D58A] p-1 shrink-0 overflow-hidden">
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
                <p className="text-xs text-[#735E18]">
                  {product.stock.toLocaleString('en-IN')} units sitting in {product.location} Hub
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase text-[#735E18]">Tied-up Value</p>
              <p className="font-mono font-black text-sm text-[#202A24]">
                ₹{tiedCapital.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* 3 Actionable Solutions */}
          <div className="space-y-3">
            {/* Solution 1: Bank / Payment Method Discount */}
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] hover:border-[#064E36] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#DCEFE3] text-[#064E36] flex items-center justify-center shrink-0 mt-0.5">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-[#202A24]">
                    1. Add Bank &amp; Payment Method Discount
                  </h4>
                  <p className="text-xs text-[#7C877F] mt-0.5">
                    Attach instant cashback for Netbanking (HDFC, SBI, ICICI) or Credit Cards to boost checkout conversion without lowering base MRP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPaymentDiscounts(product);
                }}
                className="px-4 py-2 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                Configure Offer →
              </button>
            </div>

            {/* Solution 2: Promotional Flash Markdown */}
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] hover:border-[#064E36] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5EBCB] text-[#7A5800] flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-[#202A24]">
                    2. Apply 12% Clearance Price Markdown
                  </h4>
                  <p className="text-xs text-[#7C877F] mt-0.5">
                    Reduce price from ₹{product.price.toLocaleString('en-IN')} to{' '}
                    <strong className="text-[#064E36]">
                      ₹{markdownPrice.toLocaleString('en-IN')}
                    </strong>{' '}
                    and feature in &ldquo;Today Best Deals!&rdquo; &amp; Smart Basket Rescue alternatives.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onApplyMarkdown(product, 12);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#EAF4EC] border border-[#064E36]/30 text-[#064E36] text-xs font-extrabold shrink-0 cursor-pointer"
              >
                Apply -12% Price
              </button>
            </div>

            {/* Solution 3: Inter-Hub Stock Rebalancing */}
            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] hover:border-[#064E36] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#064E36] flex items-center justify-center shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-[#202A24]">
                    3. Rebalance Excess Units to Partner City Hubs
                  </h4>
                  <p className="text-xs text-[#7C877F] mt-0.5">
                    Transfer 40% of sitting stock from {product.location} Hub to high-velocity regional fulfillment hubs (retaining {rebalancedStock.toLocaleString('en-IN')} units locally).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onRebalanceStock(product, rebalancedStock);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#EAF4EC] border border-[#E8EBE7] text-[#202A24] text-xs font-extrabold shrink-0 cursor-pointer"
              >
                Transfer Stock
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#E8EBE7] bg-[#FAF9F5]/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-[#E8EBE7] bg-white text-xs font-bold text-[#7C877F] hover:text-[#202A24] cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PAYMENT METHOD & BANK DISCOUNT MODAL
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentDiscountModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePaymentOffers: (productId: string, offers: PaymentDiscountOffer[]) => void;
}

const PAYMENT_METHODS: PaymentDiscountOffer['method'][] = [
  'Netbanking',
  'Credit Card',
  'Debit Card / EMI',
  'UPI',
];

const PARTNER_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India (SBI)',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'American Express',
  'All Major Banks',
];

export const PaymentDiscountModal: React.FC<PaymentDiscountModalProps> = ({
  product,
  isOpen,
  onClose,
  onSavePaymentOffers,
}) => {
  const [method, setMethod] = useState<PaymentDiscountOffer['method']>('Netbanking');
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [discountPct, setDiscountPct] = useState<number>(10);
  const [maxDiscountInr, setMaxDiscountInr] = useState<number>(2500);

  if (!isOpen || !product) return null;

  const existingOffers = product.paymentOffers || [];

  const handleAddOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const newOffer: PaymentDiscountOffer = {
      id: `offer-${Date.now()}`,
      method,
      bankName,
      discountPct,
      maxDiscountInr,
    };
    const updated = [...existingOffers, newOffer];
    onSavePaymentOffers(product.id, updated);
  };

  const handleRemoveOffer = (offerId: string) => {
    const updated = existingOffers.filter((o) => o.id !== offerId);
    onSavePaymentOffers(product.id, updated);
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

        <div className="px-6 py-4 border-b border-[#E8EBE7] flex items-center justify-between gap-4 bg-[#FAF9F5]/60">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCEFE3] text-[#064E36] text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <CreditCard className="w-3 h-3" />
              Payment Method Promotions
            </span>
            <h2 className="font-display font-black text-lg sm:text-xl text-[#202A24] tracking-tight">
              Configure Bank &amp; Payment Discounts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white text-[#7C877F] hover:text-[#202A24] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Product Header */}
          <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={product.image}
                alt={product.name}
                className="w-11 h-11 rounded-xl object-contain bg-white border border-[#E8EBE7] p-1"
              />
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-[#202A24] truncate">
                  {product.name}
                </p>
                <p className="text-xs text-[#7C877F]">
                  Base Price: <strong className="text-[#064E36]">₹{product.price.toLocaleString('en-IN')}</strong> · {product.sku}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#EAF4EC] text-[#064E36] text-xs font-extrabold">
              {existingOffers.length} Active {existingOffers.length === 1 ? 'Offer' : 'Offers'}
            </span>
          </div>

          {/* Add New Payment Offer Form */}
          <form onSubmit={handleAddOffer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                  Payment Method *
                </label>
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as PaymentDiscountOffer['method'])
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-bold text-[#202A24]"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                  Specific Partner Bank *
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-bold text-[#202A24]"
                >
                  {PARTNER_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                  Instant Discount (%) *
                </label>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 12, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPct(pct)}
                      className={`flex-1 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                        discountPct === pct
                          ? 'bg-[#064E36] text-white'
                          : 'bg-[#FAF9F5] hover:bg-[#EAF4EC] text-[#202A24] border border-[#E8EBE7]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#202A24] mb-1.5">
                  Max Discount Cap (INR ₹)
                </label>
                <select
                  value={maxDiscountInr}
                  onChange={(e) => setMaxDiscountInr(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] focus:bg-white focus:border-[#064E36] outline-none text-xs font-mono font-bold text-[#064E36]"
                >
                  <option value={1000}>Up to ₹1,000</option>
                  <option value={2500}>Up to ₹2,500</option>
                  <option value={5000}>Up to ₹5,000</option>
                  <option value={10000}>Up to ₹10,000</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#EAF4EC]/60 border border-[#C8E8D9] text-xs">
              <span className="text-[#202A24]">
                Effective Price with <strong>{bankName} {method}</strong>:
              </span>
              <span className="font-mono font-black text-sm text-[#064E36]">
                ₹
                {Math.max(
                  0,
                  product.price -
                    Math.min(
                      maxDiscountInr,
                      Math.round((product.price * discountPct) / 100)
                    )
                ).toLocaleString('en-IN')}
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-display font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#C8E8D9]" />
              <span>
                Add {discountPct}% Discount for {bankName} ({method})
              </span>
            </button>
          </form>

          {/* Active Payment Discounts List */}
          {existingOffers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#E8EBE7]">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#7C877F]">
                Active Payment Offers on This SKU
              </p>
              <div className="space-y-2">
                {existingOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#DCEFE3] text-[#064E36] font-mono text-xs font-extrabold">
                        {offer.discountPct}% OFF
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[#202A24]">
                          {offer.bankName} · {offer.method}
                        </p>
                        <p className="text-[10px] text-[#7C877F]">
                          Max instant discount up to ₹{offer.maxDiscountInr.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOffer(offer.id)}
                      className="p-1.5 rounded-lg text-[#7C877F] hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E8EBE7] bg-[#FAF9F5]/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0A2540] text-white text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
