import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minus,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react';
import type { Product as StorefrontProduct } from '../../data/products';
import { api, ApiError } from '../../lib/api';

export interface CartLine {
  product: StorefrontProduct;
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  city: string;
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onReplace: (unavailableId: string, replacement: StorefrontProduct) => void;
  onClear: () => void;
  onRefreshCatalog?: () => void;
}

type Alt = {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  stock: number;
  reason: string;
  isDeadStock?: boolean;
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  lines,
  city,
  onUpdateQty,
  onRemove,
  onReplace,
  onClear,
  onRefreshCatalog,
}) => {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'rescue' | 'done'>('cart');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [alts, setAlts] = useState<Record<string, Alt[]>>({});

  const conflicts = lines.filter((l) => l.quantity > l.product.stock || !l.product.inStock);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const shipping = lines.length ? 99 : 0;

  useEffect(() => {
    if (!open) {
      setCheckoutStep('cart');
      setError(null);
      setOrderId(null);
    }
  }, [open]);

  const loadRescue = async (productIds: string[]) => {
    const next: Record<string, Alt[]> = {};
    for (const id of productIds) {
      try {
        const res = await api<{ alternatives: Alt[] }>('/api/rescue/suggestions', {
          method: 'POST',
          body: JSON.stringify({ productId: id, city }),
        });
        next[id] = res.alternatives || [];
      } catch {
        next[id] = [];
      }
    }
    setAlts(next);
  };

  const handleCheckout = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        city,
        lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      };
      await api('/api/cart/validate', { method: 'POST', body: JSON.stringify(payload) });
      const result = await api<{ order: { id: string } }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setOrderId(result.order.id);
      setCheckoutStep('done');
      onClear();
      onRefreshCatalog?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setCheckoutStep('rescue');
        const ids = conflicts.length
          ? conflicts.map((c) => c.product.id)
          : lines.map((l) => l.product.id);
        await loadRescue(ids);
        setError('Stock conflict — choose a Smart Basket Rescue swap');
      } else {
        setError(err instanceof Error ? err.message : 'Checkout failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const closeAll = () => {
    setCheckoutStep('cart');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#101413]/50 backdrop-blur-sm"
            onClick={closeAll}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative h-full w-full max-w-md bg-[#F8F8F3] shadow-2xl border-l border-[#101413]/10 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#101413]/8">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#65B99B]">
                  {checkoutStep === 'rescue'
                    ? 'Smart Basket Rescue'
                    : checkoutStep === 'done'
                      ? 'Order Confirmed'
                      : 'Your Basket'}
                </p>
                <h2 className="font-display font-black text-lg text-[#0A2540]">
                  {checkoutStep === 'done'
                    ? 'All set'
                    : `${lines.length} item${lines.length === 1 ? '' : 's'}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeAll}
                className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-[#101413]/10 cursor-pointer"
              >
                <X className="w-4 h-4 text-[#0A2540]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3">
                  {error}
                </div>
              )}

              {checkoutStep === 'done' && (
                <div className="rounded-2xl bg-white border border-[#C8E8D9] p-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-[#65B99B] mx-auto mb-3" />
                  <p className="font-display font-bold text-[#0A2540]">Order authorized</p>
                  <p className="text-xs text-[#101413]/60 mt-1">
                    Order {orderId?.slice(0, 8)}… saved in Aiven PostgreSQL. Inventory decremented
                    atomically.
                  </p>
                </div>
              )}

              {checkoutStep === 'cart' && lines.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#101413]/15 bg-white p-8 text-center">
                  <ShoppingBag className="w-8 h-8 text-[#65B99B] mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#0A2540]">Basket is empty</p>
                </div>
              )}

              {checkoutStep === 'cart' &&
                lines.map((line) => {
                  const blocked = line.quantity > line.product.stock || !line.product.inStock;
                  return (
                    <div
                      key={line.product.id}
                      className={`rounded-2xl bg-white border p-3.5 ${
                        blocked ? 'border-red-200 bg-red-50/40' : 'border-[#101413]/8'
                      }`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={line.product.image || ''}
                          alt={line.product.name}
                          className="w-16 h-16 rounded-xl object-cover bg-[#EAF4EC]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0A2540] truncate">
                            {line.product.name}
                          </p>
                          <p className="text-[10px] text-[#101413]/50">
                            {city} · {line.product.stock} available
                          </p>
                          <p className="text-sm font-extrabold text-[#0A2540] mt-1">
                            ₹{(line.product.price * line.quantity).toLocaleString('en-IN')}
                          </p>
                          {blocked && (
                            <p className="text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Stock conflict
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] p-0.5">
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-white cursor-pointer"
                            onClick={() => onUpdateQty(line.product.id, line.quantity - 1)}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold">{line.quantity}</span>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-white cursor-pointer"
                            onClick={() =>
                              onUpdateQty(
                                line.product.id,
                                Math.min(line.quantity + 1, Math.max(line.product.stock, 1))
                              )
                            }
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(line.product.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {checkoutStep === 'rescue' && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#0A2540] text-white p-4">
                    <div className="flex items-center gap-2 text-[#65B99B] text-[10px] font-extrabold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Smart Basket Rescue
                    </div>
                    <p className="text-sm font-bold mt-1">
                      Swap unavailable items (±20% price, same category, dead-stock boosted).
                    </p>
                  </div>
                  {(conflicts.length ? conflicts : lines).map((line) => (
                    <div
                      key={line.product.id}
                      className="rounded-2xl bg-white border border-red-200 p-4 space-y-3"
                    >
                      <p className="text-xs font-bold text-[#0A2540] line-through opacity-70">
                        {line.product.name}
                      </p>
                      {(alts[line.product.id] || []).length === 0 ? (
                        <p className="text-[11px] text-[#7C877F]">No in-stock alternatives.</p>
                      ) : (
                        (alts[line.product.id] || []).map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            onClick={() => {
                              onReplace(line.product.id, {
                                id: alt.id,
                                name: alt.name,
                                brand: alt.brand,
                                category: line.product.category,
                                price: alt.price,
                                image: alt.imageUrl,
                                city,
                                stock: alt.stock,
                                inStock: alt.stock > 0,
                                rating: 4.8,
                                reviewsCount: 10,
                              });
                              setCheckoutStep('cart');
                              setError(null);
                            }}
                            className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-[#101413]/8 hover:border-[#65B99B] text-left cursor-pointer"
                          >
                            <img
                              src={alt.imageUrl || ''}
                              alt=""
                              className="w-11 h-11 rounded-lg object-cover bg-[#EAF4EC]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-[#0A2540] truncate">
                                {alt.name}
                              </p>
                              <p className="text-[10px] text-[#101413]/55">{alt.reason}</p>
                            </div>
                            <span className="text-[10px] font-bold text-[#064E36] bg-[#DCEFE3] px-2 py-1 rounded-lg">
                              Swap
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {checkoutStep !== 'done' && (
              <div className="border-t border-[#101413]/8 p-5 space-y-3 bg-white/70">
                <div className="flex justify-between text-xs text-[#101413]/70">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-[#101413]/70">
                  <span>Shipping</span>
                  <span>₹{shipping.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-display font-black text-[#0A2540]">
                  <span>Total</span>
                  <span>₹{(subtotal + shipping).toLocaleString('en-IN')}</span>
                </div>

                {checkoutStep === 'cart' ? (
                  <button
                    type="button"
                    disabled={lines.length === 0 || busy}
                    onClick={handleCheckout}
                    className="w-full py-3 rounded-2xl bg-[#0A2540] hover:bg-[#101413] disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {busy ? (
                      'Placing…'
                    ) : conflicts.length > 0 ? (
                      <>
                        <Sparkles className="w-4 h-4 text-[#E8C86B]" />
                        Checkout with Rescue
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#65B99B]" />
                        Place Order
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart')}
                    className="w-full py-3 rounded-2xl bg-[#DCEFE3] text-[#064E36] text-sm font-bold cursor-pointer"
                  >
                    Back to basket
                  </button>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
