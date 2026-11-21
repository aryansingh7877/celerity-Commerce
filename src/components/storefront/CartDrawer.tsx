import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minus,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ShoppingBag,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { CityName, MultiCityProduct } from '../../lib/storefrontCatalog';
import { CartItemLine } from './CheckoutAndRescueView';
import { getStockBadgeMeta } from './ProductDetailView';

export type CartLine = CartItemLine;

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  city: CityName;
  lines: CartItemLine[];
  catalog: MultiCityProduct[];
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onProceedToCheckout: (simulateConflict?: boolean) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  city,
  lines,
  catalog,
  onUpdateQty,
  onRemove,
  onClear,
  onProceedToCheckout,
}) => {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0
  );
  const totalCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const hasCityConflict = lines.some((line) => {
    const fresh =
      catalog.find((p) => p.id === line.product.id) || line.product;
    const avail = fresh.cityStock[city] ?? 0;
    return avail < line.quantity || avail <= 0;
  });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Close cart drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#101413]/50 backdrop-blur-xs"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative h-full w-full max-w-md bg-[#F8F8F3] shadow-2xl border-l border-[#E8EBE7] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-[#E8EBE7]">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#064E36]">
                  <MapPin className="w-3 h-3" />
                  {city} Fulfillment Hub
                </div>
                <h2 className="font-display font-black text-xl text-[#0A2540] mt-0.5">
                  Your Basket ({totalCount} {totalCount === 1 ? 'Item' : 'Items'})
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {lines.length > 0 && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-[11px] font-bold text-[#7C877F] hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 cursor-pointer transition-all"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[#FAF9F5] border border-[#E8EBE7] cursor-pointer"
                >
                  <X className="w-4 h-4 text-[#0A2540]" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {lines.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#C8E8D9] bg-white p-10 text-center space-y-3 my-8">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF4EC] text-[#064E36] flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-display font-black text-base text-[#0A2540]">
                      Your {city} basket is empty
                    </p>
                    <p className="text-xs text-[#7C877F] mt-1 leading-relaxed">
                      Explore deals in {city} and add items to test instant checkout or Smart Basket Rescue.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#064E36] text-white text-xs font-extrabold cursor-pointer"
                  >
                    Start Shopping
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  {hasCityConflict && (
                    <div className="rounded-2xl bg-[#F5EBCB] border border-[#E8C86B] p-3.5 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#7A5800] shrink-0 mt-0.5" />
                      <div className="text-xs text-[#7A5800]">
                        <p className="font-extrabold">
                          Stock Conflict in {city} Hub
                        </p>
                        <p className="text-[11px] mt-0.5 leading-relaxed">
                          One or more items exceed available stock in {city}. Proceed to checkout to trigger <strong>Smart Basket Rescue</strong> (±20% alternatives).
                        </p>
                      </div>
                    </div>
                  )}

                  {lines.map((line) => {
                    const fresh =
                      catalog.find((p) => p.id === line.product.id) ||
                      line.product;
                    const cityStock = fresh.cityStock[city] ?? 0;
                    const badge = getStockBadgeMeta(cityStock);
                    const isConflict =
                      cityStock <= 0 || line.quantity > cityStock;

                    return (
                      <div
                        key={line.product.id}
                        className={`rounded-2xl bg-white border p-4 transition-all ${
                          isConflict
                            ? 'border-[#E8C86B] bg-[#F5EBCB]/25'
                            : 'border-[#E8EBE7]'
                        }`}
                      >
                        <div className="flex gap-3.5">
                          <img
                            src={line.product.image}
                            alt={line.product.name}
                            className="w-16 h-16 rounded-xl object-contain bg-[#FAF9F5] border border-[#E8EBE7] p-1.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-extrabold text-[#0A2540] line-clamp-1">
                                {line.product.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => onRemove(line.product.id)}
                                className="text-[#7C877F] hover:text-red-600 p-1 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${badge.pillClass}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`}
                                />
                                {city}: {badge.label}
                              </span>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between">
                              <div className="inline-flex items-center rounded-full bg-[#FAF9F5] border border-[#E8EBE7] p-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQty(
                                      line.product.id,
                                      line.quantity - 1
                                    )
                                  }
                                  className="p-1.5 rounded-full hover:bg-white cursor-pointer"
                                >
                                  <Minus className="w-3 h-3 text-[#0A2540]" />
                                </button>
                                <span className="w-7 text-center text-xs font-extrabold text-[#0A2540]">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateQty(
                                      line.product.id,
                                      Math.min(
                                        line.quantity + 1,
                                        Math.max(cityStock, 1)
                                      )
                                    )
                                  }
                                  disabled={
                                    cityStock > 0 && line.quantity >= cityStock
                                  }
                                  className="p-1.5 rounded-full hover:bg-white disabled:opacity-40 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3 text-[#0A2540]" />
                                </button>
                              </div>

                              <p className="font-display font-black text-sm text-[#0A2540]">
                                ₹
                                {(
                                  line.product.price * line.quantity
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            {lines.length > 0 && (
              <div className="border-t border-[#E8EBE7] bg-white p-5 space-y-3.5">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#7C877F]">
                    <span>Subtotal ({totalCount} items)</span>
                    <span className="font-bold text-[#0A2540]">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#7C877F]">
                    <span>{city} Hub Express Delivery</span>
                    <span className="font-extrabold text-[#064E36]">FREE</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-[#E8EBE7]">
                    <span className="font-display font-black text-sm text-[#0A2540]">
                      Total
                    </span>
                    <span className="font-display font-black text-xl text-[#0A2540]">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onProceedToCheckout(false)}
                    className="w-full py-3.5 px-5 rounded-full bg-[#0A2540] hover:bg-[#101413] text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#65B99B]" />
                    Proceed to Checkout
                  </button>

                  <button
                    type="button"
                    onClick={() => onProceedToCheckout(true)}
                    className="w-full py-2.5 px-4 rounded-full bg-[#F5EBCB] hover:bg-[#E8D58A] text-[#0A2540] border border-[#E8C86B] text-[11px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#7A5800]" />
                    Demo: Checkout & Simulate Stock Conflict (Rescue)
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
