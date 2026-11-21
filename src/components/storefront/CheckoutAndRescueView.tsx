import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Minus,
  Plus,
  Trash2,
  RefreshCw,
  HelpCircle,
  ShoppingBag,
  ArrowRight,
  PackageCheck,
  Info,
  XCircle,
} from 'lucide-react';
import {
  CityName,
  CITIES,
  MultiCityProduct,
  getRescueAlternatives,
  saveStockOverride,
  recordPipelineEvent,
} from '../../lib/storefrontCatalog';
import { getStockBadgeMeta } from './ProductDetailView';

export interface CartItemLine {
  product: MultiCityProduct;
  quantity: number;
}

export interface ConfirmedOrderRecord {
  orderNumber: string;
  city: CityName;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: CartItemLine[];
  totalAmount: number;
  placedAt: string;
}

interface CheckoutAndRescueViewProps {
  mode: 'checkout' | 'rescue' | 'confirmed';
  setMode: (mode: 'checkout' | 'rescue' | 'confirmed') => void;
  city: CityName;
  cart: CartItemLine[];
  catalog: MultiCityProduct[];
  simulateConflict: boolean;
  setSimulateConflict: (val: boolean) => void;
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onReplaceItem: (
    oldProductId: string,
    newProduct: MultiCityProduct,
    quantity: number
  ) => void;
  onOrderSuccess: (order: ConfirmedOrderRecord) => void;
  confirmedOrder: ConfirmedOrderRecord | null;
  onBackToShop: () => void;
  onOpenPipelineStatus: () => void;
  onRefreshCatalog: () => void;
}

export const CheckoutAndRescueView: React.FC<CheckoutAndRescueViewProps> = ({
  mode,
  setMode,
  city,
  cart,
  catalog,
  simulateConflict,
  setSimulateConflict,
  onUpdateQty,
  onRemoveItem,
  onReplaceItem,
  onOrderSuccess,
  confirmedOrder,
  onBackToShop,
  onOpenPipelineStatus,
  onRefreshCatalog,
}) => {
  const hubInfo = CITIES.find((c) => c.name === city) || CITIES[0];

  // Demo Shipping Details Form (No payment fields per requirement)
  const [customerName, setCustomerName] = useState('Abhishek Anil Kumar');
  const [customerPhone, setCustomerPhone] = useState('+91 98765 43210');
  const [customerAddress, setCustomerAddress] = useState(
    `42, Tech Park Boulevard, ${hubInfo.hubName}`
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [conflictTargetId, setConflictTargetId] = useState<string>('');
  const [showWhyModal, setShowWhyModal] = useState<boolean>(true);
  const [forceEmptyAlternativesDemo, setForceEmptyAlternativesDemo] =
    useState<boolean>(false);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Determine which items currently violate city stock
  const conflictedLines = cart.filter((line) => {
    const latestProd =
      catalog.find((p) => p.id === line.product.id) || line.product;
    const available = latestProd.cityStock[city] ?? 0;
    return available < line.quantity || available <= 0;
  });

  const safeLines = cart.filter((line) => {
    const latestProd =
      catalog.find((p) => p.id === line.product.id) || line.product;
    const available = latestProd.cityStock[city] ?? 0;
    return available >= line.quantity && available > 0;
  });

  const handlePlaceOrder = () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setFormError('Please fill in your name, phone number, and delivery address.');
      return;
    }
    if (cart.length === 0) {
      setFormError('Your cart is empty. Add products before placing an order.');
      return;
    }

    setFormError(null);
    setIsPlacing(true);

    setTimeout(() => {
      setIsPlacing(false);

      // If demo conflict simulation is ON and no item is currently OOS, force the selected (or first) item to sell out
      if (simulateConflict && conflictedLines.length === 0 && cart.length > 0) {
        const target =
          cart.find((l) => l.product.id === conflictTargetId) || cart[0];
        saveStockOverride(target.product.id, city, 0);
        recordPipelineEvent({
          service: 'PostgreSQL',
          topic: 'checkout.conflict_409',
          city,
          summary: `HTTP 409 STOCK_CONFLICT: ${target.product.name} (${target.product.sku}) hit 0 units in ${city} during concurrent lock`,
          status: 'CONFLICT_409',
        });
        onRefreshCatalog();
        setSimulateConflict(false);
        setMode('rescue');
        return;
      }

      // If there is already a real stock conflict in the selected city
      if (conflictedLines.length > 0) {
        const firstConflict = conflictedLines[0];
        recordPipelineEvent({
          service: 'PostgreSQL',
          topic: 'checkout.conflict_409',
          city,
          summary: `HTTP 409 STOCK_CONFLICT on ${firstConflict.product.name} in ${city} Hub`,
          status: 'CONFLICT_409',
        });
        setMode('rescue');
        return;
      }

      // Otherwise atomic checkout succeeds! Decrement stock in selected city
      cart.forEach((line) => {
        const latest =
          catalog.find((p) => p.id === line.product.id) || line.product;
        const currentStock = latest.cityStock[city] ?? 0;
        const nextStock = Math.max(0, currentStock - line.quantity);
        saveStockOverride(line.product.id, city, nextStock);
      });

      const cityCode =
        city === 'Bengaluru' ? 'BLR' : city === 'Mumbai' ? 'BOM' : 'DEL';
      const orderNum = `CEL-${cityCode}-${Math.floor(10000 + Math.random() * 89999)}`;

      recordPipelineEvent({
        service: 'PostgreSQL',
        topic: 'checkout.committed',
        city,
        summary: `Order ${orderNum} committed atomically (${cart.length} SKUs) & written to outbox_events`,
        status: 'COMMITTED',
      });
      recordPipelineEvent({
        service: 'Apache Kafka',
        topic: 'inventory.changed',
        city,
        summary: `Published stock decrement event for Order ${orderNum} → OpenSearch sync consumer`,
        status: 'PUBLISHED',
      });

      onRefreshCatalog();
      onOrderSuccess({
        orderNumber: orderNum,
        city,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        items: [...cart],
        totalAmount: subtotal,
        placedAt: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }, 450);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 3: ORDER CONFIRMATION
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'confirmed' && confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div className="rounded-[28px] bg-white border border-[#C8E8D9] p-6 sm:p-10 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8EBE7]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EAF4EC] border border-[#C8E8D9] flex items-center justify-center text-[#064E36]">
                <PackageCheck className="w-8 h-8" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCEFE3] text-[#064E36] text-[10px] font-extrabold uppercase tracking-wider">
                  PostgreSQL Atomic Commit Verified
                </span>
                <h1 className="font-display font-black text-2xl sm:text-3xl text-[#0A2540] mt-1">
                  Order Confirmed!
                </h1>
                <p className="text-xs text-[#7C877F]">
                  Placed at {confirmedOrder.placedAt} · Dispatched from{' '}
                  <strong className="text-[#0A2540]">{confirmedOrder.city} Hub</strong>
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] px-4 py-3 text-left sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C877F]">
                Order Number
              </p>
              <p className="font-display font-black text-lg text-[#064E36]">
                #{confirmedOrder.orderNumber}
              </p>
            </div>
          </div>

          {/* Delivery & Hub Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] p-4 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#7C877F]">
                Delivery Recipient
              </p>
              <p className="text-sm font-extrabold text-[#0A2540]">
                {confirmedOrder.customerName}
              </p>
              <p className="text-xs text-[#202A24]/80">{confirmedOrder.customerPhone}</p>
              <p className="text-xs text-[#7C877F]">{confirmedOrder.customerAddress}</p>
            </div>

            <div className="rounded-2xl bg-[#EAF4EC]/60 border border-[#C8E8D9] p-4 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#064E36]">
                Fulfillment City & Event Pipeline
              </p>
              <p className="text-sm font-extrabold text-[#0A2540] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#064E36]" />
                {confirmedOrder.city} Regional Hub
              </p>
              <p className="text-xs text-[#202A24]/80">
                Stock decremented atomically in PostgreSQL & synced to OpenSearch via Kafka outbox.
              </p>
            </div>
          </div>

          {/* Purchased Items List */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#7C877F]">
              Ordered Items ({confirmedOrder.items.reduce((s, i) => s + i.quantity, 0)})
            </h3>
            <div className="divide-y divide-[#E8EBE7] rounded-2xl border border-[#E8EBE7] overflow-hidden">
              {confirmedOrder.items.map((line) => (
                <div
                  key={line.product.id}
                  className="p-4 bg-white flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={line.product.image}
                      alt={line.product.name}
                      className="w-12 h-12 rounded-xl object-contain bg-[#FAF9F5] border border-[#E8EBE7] p-1"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[#0A2540] truncate">
                        {line.product.name}
                      </p>
                      <p className="text-xs text-[#7C877F]">
                        SKU: {line.product.sku} · Qty: {line.quantity} × ₹
                        {line.product.price.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <p className="font-display font-black text-sm text-[#0A2540] shrink-0">
                    ₹{(line.product.price * line.quantity).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Total Box */}
          <div className="rounded-2xl bg-[#0A2540] text-white p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/70">Total Order Value (Free Hub Delivery)</p>
              <p className="text-[11px] text-[#65B99B] font-semibold">
                Demo Order · No Payment Charged
              </p>
            </div>
            <p className="font-display font-black text-2xl">
              ₹{confirmedOrder.totalAmount.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenPipelineStatus}
              className="px-5 py-3 rounded-full bg-[#FAF9F5] hover:bg-[#EAF4EC] border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] cursor-pointer transition-all"
            >
              View PostgreSQL → Kafka → OpenSearch Flow
            </button>
            <button
              type="button"
              onClick={onBackToShop}
              className="px-7 py-3.5 rounded-full bg-[#064E36] hover:bg-[#103C2D] text-white text-sm font-extrabold flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 2: SMART BASKET RESCUE (CORE DIFFERENTIATOR)
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'rescue') {
    return (
      <div className="max-w-5xl mx-auto py-4 space-y-6">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMode('checkout')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8EBE7] text-xs font-bold text-[#0A2540] hover:bg-[#EAF4EC] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Checkout Summary
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowWhyModal((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EAF4EC] border border-[#C8E8D9] text-xs font-extrabold text-[#064E36] cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {showWhyModal ? 'Hide' : 'Show'} “Why these alternatives?”
            </button>
            <button
              type="button"
              onClick={() => setForceEmptyAlternativesDemo((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all ${
                forceEmptyAlternativesDemo
                  ? 'bg-[#0A2540] text-white border-[#0A2540]'
                  : 'bg-white text-[#7C877F] border-[#E8EBE7] hover:text-[#0A2540]'
              }`}
            >
              {forceEmptyAlternativesDemo
                ? 'Showing: No-Alternatives Fallback'
                : 'Test “No Alternatives Exist” Case'}
            </button>
          </div>
        </div>

        {/* Hero Conflict Banner */}
        <div className="rounded-[28px] bg-gradient-to-r from-[#0A2540] via-[#103C2D] to-[#064E36] text-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5EBCB] text-[#7A5800] text-[11px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                HTTP 409 Stock Conflict · Smart Basket Rescue
              </div>
              <h1 className="font-display font-black text-2xl sm:text-3xl leading-tight">
                {conflictedLines.length > 0
                  ? `Sorry, ${conflictedLines.map((c) => c.product.name).join(', ')} just sold out in ${city}.`
                  : `All stock conflicts in ${city} have been resolved!`}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                <strong>The rest of your basket is untouched and reserved.</strong> Swap the unavailable item with one click below from verified in-stock alternatives in{' '}
                <strong>{city}</strong>, then retry checkout immediately.
              </p>
            </div>

            {conflictedLines.length === 0 && cart.length > 0 && (
              <button
                type="button"
                onClick={handlePlaceOrder}
                className="px-7 py-4 rounded-full bg-[#65B99B] hover:bg-[#C8E8D9] text-[#0A2540] font-display font-black text-sm flex items-center gap-2 shrink-0 cursor-pointer shadow-lg"
              >
                <CheckCircle2 className="w-5 h-5" />
                Retry Checkout & Place Order →
              </button>
            )}
          </div>
        </div>

        {/* "Why these alternatives?" Explanation Card */}
        {showWhyModal && (
          <div className="rounded-[24px] bg-[#FAF9F5] border border-[#C8E8D9] p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-black text-sm sm:text-base text-[#0A2540] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#064E36]" />
                Why these alternatives? (Deterministic Matching Rules)
              </h3>
              <span className="text-[11px] font-bold text-[#064E36] bg-[#EAF4EC] px-2.5 py-0.5 rounded-full">
                Zero Hallucinations · Sub-15ms Query
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-white border border-[#E8EBE7] p-3.5">
                <p className="font-extrabold text-[#0A2540]">1. Same Category Match</p>
                <p className="text-[#7C877F] mt-1">
                  Only products in the exact same category as the sold-out item are eligible.
                </p>
              </div>
              <div className="rounded-xl bg-white border border-[#E8EBE7] p-3.5">
                <p className="font-extrabold text-[#0A2540]">
                  2. Verified In-Stock in {city}
                </p>
                <p className="text-[#7C877F] mt-1">
                  Filtered by live {city} Hub stock (&gt; 0 units ready for immediate dispatch).
                </p>
              </div>
              <div className="rounded-xl bg-white border border-[#E8EBE7] p-3.5">
                <p className="font-extrabold text-[#0A2540]">3. Within ±20% Price Window</p>
                <p className="text-[#7C877F] mt-1">
                  Priced between 80% and 120% of your original item, ranked by closest price first (max 4).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Safe & Untouched Cart Items */}
        {safeLines.length > 0 && (
          <div className="rounded-[24px] bg-white border border-[#E8EBE7] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-base text-[#0A2540] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#064E36]" />
                Safe & Untouched Items in Your Basket ({safeLines.length})
              </h2>
              <span className="px-3 py-1 rounded-full bg-[#EAF4EC] text-[#064E36] text-xs font-extrabold">
                ✓ Reserved in {city}
              </span>
            </div>
            <div className="divide-y divide-[#E8EBE7]">
              {safeLines.map((line) => (
                <div
                  key={line.product.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={line.product.image}
                      alt={line.product.name}
                      className="w-12 h-12 rounded-xl object-contain bg-[#FAF9F5] border border-[#E8EBE7] p-1"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-[#0A2540]">
                        {line.product.name}
                      </p>
                      <p className="text-xs text-[#7C877F]">
                        Qty: {line.quantity} · ₹{line.product.price.toLocaleString('en-IN')} each
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-black text-sm text-[#0A2540]">
                      ₹{(line.product.price * line.quantity).toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] font-extrabold text-[#064E36]">
                      ✓ Ready to ship
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Conflicted Items & Up to 4 Alternatives */}
        {conflictedLines.length > 0 ? (
          conflictedLines.map((conflict) => {
            const { alternatives, minPrice, maxPrice } = getRescueAlternatives(
              conflict.product,
              city,
              catalog
            );
            const displayedAlternatives = forceEmptyAlternativesDemo
              ? []
              : alternatives;

            return (
              <div
                key={conflict.product.id}
                className="rounded-[28px] bg-white border-2 border-[#E8C86B] p-6 sm:p-8 space-y-6 shadow-xs"
              >
                {/* Sold-out item header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8EBE7]">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={conflict.product.image}
                        alt={conflict.product.name}
                        className="w-16 h-16 rounded-2xl object-contain bg-[#FAF9F5] border border-red-200 p-1.5 opacity-60"
                      />
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase">
                        0 Left
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">
                        Sold Out in {city} Hub · {conflict.product.category}
                      </span>
                      <h3 className="font-display font-black text-lg text-[#0A2540] line-through opacity-75">
                        {conflict.product.name}
                      </h3>
                      <p className="text-xs text-[#7C877F]">
                        Original Price:{' '}
                        <strong className="text-[#0A2540]">
                          ₹{conflict.product.price.toLocaleString('en-IN')}
                        </strong>{' '}
                        · Target ±20% Range:{' '}
                        <strong className="text-[#064E36]">
                          ₹{minPrice.toLocaleString('en-IN')} – ₹
                          {maxPrice.toLocaleString('en-IN')}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(conflict.product.id)}
                    className="self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-700 text-xs font-extrabold cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Unavailable Item
                  </button>
                </div>

                {/* Alternatives Grid (Up to 4) or Fallback State */}
                {displayedAlternatives.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-display font-black text-base text-[#0A2540]">
                        Select a 1-Click Replacement ({displayedAlternatives.length} verified in{' '}
                        {city})
                      </h4>
                      <span className="text-xs text-[#7C877F]">
                        Sorted by closest price to ₹
                        {conflict.product.price.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {displayedAlternatives.map((alt) => {
                        const altStock = alt.cityStock[city] ?? 0;
                        const altBadge = getStockBadgeMeta(altStock);
                        const delta = alt.priceDelta;

                        return (
                          <div
                            key={alt.id}
                            className="rounded-2xl bg-[#FAF9F5] hover:bg-white border border-[#E8EBE7] hover:border-[#65B99B] p-4 flex flex-col justify-between transition-all shadow-2xs"
                          >
                            <div>
                              <div className="relative aspect-4/3 rounded-xl bg-white border border-[#E8EBE7] p-3 mb-3 flex items-center justify-center">
                                <img
                                  src={alt.image}
                                  alt={alt.name}
                                  className="w-full h-full object-contain"
                                />
                                <span
                                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${altBadge.pillClass}`}
                                >
                                  {altBadge.label} ({altStock})
                                </span>
                              </div>

                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#064E36]">
                                {alt.brand} · {alt.category}
                              </p>
                              <h5 className="font-display font-bold text-sm text-[#0A2540] line-clamp-2 mt-0.5 min-h-[2.5rem]">
                                {alt.name}
                              </h5>

                              <div className="mt-2 flex items-baseline justify-between gap-2">
                                <span className="font-display font-black text-base text-[#0A2540]">
                                  ₹{alt.price.toLocaleString('en-IN')}
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    delta === 0
                                      ? 'bg-[#EAF4EC] text-[#064E36]'
                                      : delta > 0
                                        ? 'bg-[#F5EBCB] text-[#7A5800]'
                                        : 'bg-[#DCEFE3] text-[#064E36]'
                                  }`}
                                >
                                  {delta === 0
                                    ? 'Same Price'
                                    : delta > 0
                                      ? `+₹${delta.toLocaleString('en-IN')}`
                                      : `-₹${Math.abs(delta).toLocaleString('en-IN')}`}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                recordPipelineEvent({
                                  service: 'OpenSearch',
                                  topic: 'rescue.alternative_swapped',
                                  city,
                                  summary: `Smart Basket Rescue replaced ${conflict.product.sku} with ${alt.sku} in ${city}`,
                                  status: 'INDEXED',
                                });
                                onReplaceItem(
                                  conflict.product.id,
                                  alt,
                                  Math.min(conflict.quantity, altStock)
                                );
                              }}
                              className="mt-4 w-full py-2.5 px-4 rounded-full bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              One-Click Replace
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Handle the case where NO alternatives exist */
                  <div className="rounded-2xl bg-[#FAF9F5] border border-dashed border-[#E8EBE7] p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EBCB] text-[#7A5800] flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="font-display font-black text-base text-[#0A2540]">
                        No Matching Alternatives Available in {city}
                      </h4>
                      <p className="text-xs text-[#7C877F] leading-relaxed">
                        We checked all in-stock <strong>{conflict.product.category}</strong> in{' '}
                        <strong>{city}</strong> within ±20% of ₹
                        {conflict.product.price.toLocaleString('en-IN')} (₹
                        {minPrice.toLocaleString('en-IN')} – ₹
                        {maxPrice.toLocaleString('en-IN')}), and none are currently available.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(conflict.product.id)}
                        className="px-5 py-2.5 rounded-full bg-[#0A2540] text-white text-xs font-extrabold cursor-pointer"
                      >
                        Remove Sold-Out Item & Continue Checkout
                      </button>
                      <button
                        type="button"
                        onClick={onBackToShop}
                        className="px-5 py-2.5 rounded-full bg-white border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] cursor-pointer"
                      >
                        Keep Browsing Catalog
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* All Conflicts Resolved Banner */
          <div className="rounded-[28px] bg-[#EAF4EC] border border-[#C8E8D9] p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-[#064E36] mx-auto" />
            <div>
              <h3 className="font-display font-black text-xl text-[#0A2540]">
                Basket Rescued & Ready for Dispatch!
              </h3>
              <p className="text-xs text-[#202A24]/80 mt-1">
                Every item in your cart now has verified stock in <strong>{city}</strong>.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={cart.length === 0}
                className="px-8 py-3.5 rounded-full bg-[#064E36] hover:bg-[#103C2D] disabled:opacity-40 text-white text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                Retry Checkout & Place Order (₹{subtotal.toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={onBackToShop}
                className="px-6 py-3.5 rounded-full bg-white border border-[#E8EBE7] text-xs font-extrabold text-[#0A2540] cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW 1: CHECKOUT REVIEW & DEMO DETAILS FORM (No Payment Fields)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto py-4 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToShop}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#E8EBE7] text-xs font-bold text-[#0A2540] hover:bg-[#EAF4EC] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#064E36]" />
          Continue Shopping
        </button>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAF4EC] border border-[#C8E8D9] text-xs font-extrabold text-[#064E36]">
          <MapPin className="w-3.5 h-3.5" />
          Fulfilling from {city} Hub ({hubInfo.sla})
        </div>
      </div>

      {/* Judge / Demo Stock Conflict Simulator Banner */}
      <div className="rounded-[24px] bg-gradient-to-r from-[#F5EBCB] via-[#FAF3DD] to-[#EAF4EC] border border-[#E8C86B] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0A2540] text-[#E8C86B] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#0A2540]">
                Interactive Demo Mode · Smart Basket Rescue Trigger
              </p>
              <span className="px-2 py-0.5 rounded-full bg-[#064E36] text-white text-[10px] font-bold">
                Core Differentiator
              </span>
            </div>
            <p className="text-xs text-[#202A24]/80 mt-0.5">
              Enable this toggle to simulate another customer buying the last unit of an item in{' '}
              <strong>{city}</strong> right as you click <strong>Place Order</strong> (triggers HTTP 409 & Smart Basket Rescue).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {simulateConflict && cart.length > 1 && (
            <select
              value={conflictTargetId || cart[0]?.product.id || ''}
              onChange={(e) => setConflictTargetId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E8C86B] text-xs font-bold text-[#0A2540]"
            >
              {cart.map((line) => (
                <option key={line.product.id} value={line.product.id}>
                  Sell out: {line.product.name.slice(0, 26)}...
                </option>
              ))}
            </select>
          )}

          <label className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white border border-[#E8C86B] cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={simulateConflict}
              onChange={(e) => setSimulateConflict(e.target.checked)}
              className="w-4 h-4 accent-[#064E36] rounded cursor-pointer"
            />
            <span className="text-xs font-extrabold text-[#0A2540]">
              Simulate Stock Conflict on Place Order
            </span>
          </label>
        </div>
      </div>

      {/* Main 2-Column Checkout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Demo Shipping Details (No Payment Fields) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-[28px] bg-white border border-[#E8EBE7] p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#E8EBE7] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#064E36]">
                  Step 1 of 1 · Fast Demo Checkout
                </span>
                <h2 className="font-display font-black text-xl text-[#0A2540]">
                  Delivery Details ({city})
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#FAF9F5] border border-[#E8EBE7] text-[11px] font-bold text-[#7C877F]">
                No Payment Fields Required
              </span>
            </div>

            {formError && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-700 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-[#0A2540]">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter recipient full name"
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] text-sm font-semibold text-[#0A2540] focus:outline-none focus:bg-white focus:border-[#064E36]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-[#0A2540]">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] text-sm font-semibold text-[#0A2540] focus:outline-none focus:bg-white focus:border-[#064E36]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-[#0A2540]">
                Street Address & Landmark in {city} *
              </label>
              <textarea
                rows={3}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder={`House/Flat No., Street, Locality in ${city}`}
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] text-sm font-semibold text-[#0A2540] focus:outline-none focus:bg-white focus:border-[#064E36]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#7C877F]">
                  Selected Fulfillment City
                </p>
                <p className="text-sm font-extrabold text-[#0A2540] mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#064E36]" />
                  {city} (PIN {hubInfo.pin})
                </p>
              </div>
              <div className="rounded-2xl bg-[#EAF4EC]/50 border border-[#C8E8D9] p-3.5">
                <p className="text-[10px] font-bold uppercase text-[#064E36]">
                  Dispatch Guarantee
                </p>
                <p className="text-sm font-extrabold text-[#0A2540] mt-0.5">
                  {hubInfo.sla}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Order Summary & Place Order CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-[28px] bg-white border border-[#E8EBE7] p-6 sm:p-8 space-y-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-xl text-[#0A2540]">
                Order Summary
              </h2>
              <span className="text-xs font-extrabold text-[#064E36] bg-[#EAF4EC] px-3 py-1 rounded-full">
                {cart.reduce((s, l) => s + l.quantity, 0)} Items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="rounded-2xl bg-[#FAF9F5] border border-dashed border-[#E8EBE7] p-8 text-center space-y-3">
                <ShoppingBag className="w-8 h-8 text-[#7C877F] mx-auto" />
                <p className="text-sm font-bold text-[#0A2540]">Your cart is empty</p>
                <button
                  type="button"
                  onClick={onBackToShop}
                  className="px-5 py-2.5 rounded-full bg-[#064E36] text-white text-xs font-extrabold cursor-pointer"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8EBE7] max-h-[360px] overflow-y-auto pr-1">
                {cart.map((line) => {
                  const fresh =
                    catalog.find((p) => p.id === line.product.id) || line.product;
                  const cityAvail = fresh.cityStock[city] ?? 0;
                  const isLineConflict = cityAvail < line.quantity || cityAvail <= 0;
                  const badge = getStockBadgeMeta(cityAvail);

                  return (
                    <div key={line.product.id} className="py-3.5 space-y-2">
                      <div className="flex items-start gap-3">
                        <img
                          src={line.product.image}
                          alt={line.product.name}
                          className="w-14 h-14 rounded-xl object-contain bg-[#FAF9F5] border border-[#E8EBE7] p-1 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-[#0A2540] truncate">
                            {line.product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badge.pillClass}`}
                            >
                              {city}: {badge.label}
                            </span>
                          </div>
                          <p className="font-display font-black text-sm text-[#0A2540] mt-1">
                            ₹{(line.product.price * line.quantity).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pl-16">
                        <div className="inline-flex items-center rounded-full bg-[#FAF9F5] border border-[#E8EBE7] p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQty(line.product.id, line.quantity - 1)
                            }
                            className="p-1.5 rounded-full hover:bg-white cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-extrabold">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQty(
                                line.product.id,
                                Math.min(line.quantity + 1, Math.max(cityAvail, 1))
                              )
                            }
                            className="p-1.5 rounded-full hover:bg-white cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(line.product.id)}
                          className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>

                      {isLineConflict && (
                        <div className="rounded-xl bg-[#F5EBCB] border border-[#E8C86B] px-3 py-1.5 text-[11px] font-bold text-[#7A5800] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Stock conflict in {city} — Smart Basket Rescue will launch on Place Order.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-[#E8EBE7] pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-[#7C877F]">
                <span>Subtotal</span>
                <span className="font-bold text-[#0A2540]">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#7C877F]">
                <span>{city} Hub Same-Day Delivery</span>
                <span className="font-extrabold text-[#064E36]">FREE</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-[#E8EBE7]">
                <span className="font-display font-black text-base text-[#0A2540]">
                  Order Total
                </span>
                <span className="font-display font-black text-2xl text-[#0A2540]">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              type="button"
              disabled={cart.length === 0 || isPlacing}
              onClick={handlePlaceOrder}
              className={`w-full py-4 px-6 rounded-full font-display font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm ${
                simulateConflict || conflictedLines.length > 0
                  ? 'bg-[#0A2540] hover:bg-[#101413] text-white'
                  : 'bg-[#064E36] hover:bg-[#103C2D] text-white'
              } disabled:opacity-40`}
            >
              {isPlacing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#65B99B]" />
                  Acquiring PostgreSQL Stock Lock...
                </>
              ) : simulateConflict || conflictedLines.length > 0 ? (
                <>
                  <Sparkles className="w-4 h-4 text-[#E8C86B]" />
                  Place Order (Will Trigger Smart Basket Rescue)
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#65B99B]" />
                  Place Order · ₹{subtotal.toLocaleString('en-IN')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
