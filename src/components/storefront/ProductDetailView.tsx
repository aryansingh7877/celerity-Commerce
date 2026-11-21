import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  ShieldCheck,
  Truck,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  ShoppingBag,
  Info,
} from 'lucide-react';
import {
  CityName,
  CITIES,
  MultiCityProduct,
} from '../../lib/storefrontCatalog';
import { ProductImage } from './ProductImage';

interface ProductDetailViewProps {
  product: MultiCityProduct;
  city: CityName;
  allProducts: MultiCityProduct[];
  onBack: () => void;
  onSelectCity: (city: CityName) => void;
  onAddToCart: (product: MultiCityProduct, quantity: number) => void;
  onBuyNow: (product: MultiCityProduct, quantity: number) => void;
  onSelectProduct: (product: MultiCityProduct) => void;
}

export function getStockBadgeMeta(stock: number) {
  if (stock <= 0) {
    return {
      label: 'Out of stock',
      detail: '0 units available',
      pillClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500',
      status: 'out' as const,
    };
  }
  if (stock <= 3) {
    return {
      label: `Only ${stock} left`,
      detail: 'Low stock — order soon',
      pillClass: 'bg-[#F5EBCB] text-[#7A5800] border-[#E8C86B]',
      dotClass: 'bg-[#D99B26]',
      status: 'low' as const,
    };
  }
  return {
    label: 'In stock',
    detail: `${stock} units ready for dispatch`,
    pillClass: 'bg-[#EAF4EC] text-[#064E36] border-[#C8E8D9]',
    dotClass: 'bg-[#064E36]',
    status: 'in' as const,
  };
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  city,
  allProducts,
  onBack,
  onSelectCity,
  onAddToCart,
  onBuyNow,
  onSelectProduct,
}) => {
  const currentCityStock = product.cityStock[city] ?? 0;
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    setQuantity(1);
  }, [product.id, city]);

  const badge = getStockBadgeMeta(currentCityStock);
  const currentHubMeta = CITIES.find((c) => c.name === city) || CITIES[0];
  const discountPct =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const similarProducts = allProducts
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Breadcrumb & Back action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#E8EBE7] text-xs font-bold text-[#0A2540] hover:bg-[#EAF4EC] hover:border-[#C8E8D9] transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#064E36]" />
          Back to Catalog
        </button>

        <div className="text-xs font-semibold text-[#7C877F] flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-[#0A2540] cursor-pointer"
          >
            Storefront
          </button>
          <span>/</span>
          <span className="text-[#064E36] font-bold">{product.category}</span>
          <span>/</span>
          <span className="text-[#0A2540] font-bold truncate max-w-[220px]">
            {product.name}
          </span>
        </div>
      </div>

      {/* Main 2-Column Product Detail Card */}
      <div className="rounded-[28px] bg-white border border-[#E8EBE7] p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Left: Product Visual Gallery */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="relative aspect-square rounded-[24px] bg-[#FAF9F5] border border-[#E8EBE7] overflow-hidden flex items-center justify-center p-6">
              <ProductImage
                src={product.image}
                alt={product.name}
                category={product.category}
                loading="eager"
                className="w-full h-full object-contain rounded-2xl transition-transform duration-500 hover:scale-105"
              />

              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {product.isJustIn && (
                  <span className="px-3 py-1 rounded-full bg-[#F5EBCB] border border-[#E8C86B] text-[#7A5800] text-[11px] font-extrabold uppercase tracking-wider">
                    Just In
                  </span>
                )}
                {discountPct > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[#064E36] text-white text-[11px] font-extrabold">
                    {discountPct}% OFF
                  </span>
                )}
              </div>

              <div className="absolute top-4 right-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold ${badge.pillClass}`}
                >
                  <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
                  {badge.label}
                </span>
              </div>

              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-[#E8EBE7] text-[11px] font-bold text-[#0A2540]">
                  SKU: {product.sku}
                </span>
              </div>
            </div>

            {/* Trust & Fulfillment strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] p-3 text-center">
                <Truck className="w-4 h-4 text-[#064E36] mx-auto mb-1" />
                <p className="text-[11px] font-extrabold text-[#0A2540]">Local Hub SLA</p>
                <p className="text-[10px] text-[#7C877F] mt-0.5">{currentHubMeta.sla}</p>
              </div>
              <div className="rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] p-3 text-center">
                <ShieldCheck className="w-4 h-4 text-[#064E36] mx-auto mb-1" />
                <p className="text-[11px] font-extrabold text-[#0A2540]">Atomic Lock</p>
                <p className="text-[10px] text-[#7C877F] mt-0.5">No overselling</p>
              </div>
              <div className="rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] p-3 text-center">
                <MapPin className="w-4 h-4 text-[#064E36] mx-auto mb-1" />
                <p className="text-[11px] font-extrabold text-[#0A2540]">{city} Hub</p>
                <p className="text-[10px] text-[#7C877F] mt-0.5">Live stock</p>
              </div>
            </div>
          </div>

          {/* Right: Details, Multi-City Availability, Quantity & CTA */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-[#EAF4EC] text-[#064E36] text-xs font-extrabold uppercase tracking-wider">
                  {product.brand} · {product.category}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A2540]">
                  <Star className="w-4 h-4 fill-[#E8C86B] text-[#E8C86B]" />
                  <span>{product.rating}</span>
                  <span className="text-[#7C877F]">· {product.soldCount} Items Sold</span>
                </div>
              </div>

              <h1 className="font-display font-black text-2xl sm:text-3xl text-[#0A2540] leading-tight">
                {product.name}
              </h1>

              <p className="text-sm text-[#202A24]/80 leading-relaxed">
                {product.description}
              </p>

              {/* Price block */}
              <div className="rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] p-4 flex flex-wrap items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-display font-black text-3xl text-[#0A2540]">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.mrp > product.price && (
                    <span className="text-sm font-semibold text-[#7C877F] line-through">
                      ₹{product.mrp.toLocaleString('en-IN')}
                    </span>
                  )}
                  {discountPct > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#DCEFE3] text-[#064E36] text-xs font-extrabold">
                      Save ₹{(product.mrp - product.price).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-[#7C877F]">
                  Inclusive of all taxes · Free hub dispatch
                </span>
              </div>

              {/* Selected City Hub Status + Multi-City Availability Matrix */}
              <div className="rounded-2xl border border-[#E8EBE7] bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#064E36]" />
                    <span className="text-xs font-extrabold text-[#0A2540]">
                      Availability in {city} Hub ({currentHubMeta.hubName})
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold ${badge.pillClass}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                    {badge.label} ({currentCityStock} units)
                  </span>
                </div>

                <p className="text-[11px] text-[#7C877F]">
                  Real-time inventory across all 3 regional fulfillment hubs (click any city to switch active hub):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {CITIES.map((c) => {
                    const st = product.cityStock[c.name] ?? 0;
                    const meta = getStockBadgeMeta(st);
                    const isSelected = c.name === city;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => onSelectCity(c.name)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#064E36] bg-[#EAF4EC]/60 ring-2 ring-[#064E36]/15'
                            : 'border-[#E8EBE7] bg-[#FAF9F5] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#0A2540] flex items-center gap-1">
                            {c.name}
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#064E36] text-white">
                                Active
                              </span>
                            )}
                          </span>
                          {st > 0 ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#064E36]" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </div>
                        <div className="mt-2">
                          <p
                            className={`text-xs font-extrabold ${
                              st <= 0
                                ? 'text-red-600'
                                : st <= 3
                                  ? 'text-[#7A5800]'
                                  : 'text-[#064E36]'
                            }`}
                          >
                            {meta.label}
                          </p>
                          <p className="text-[10px] text-[#7C877F]">
                            {st} {st === 1 ? 'unit' : 'units'} in hub
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quantity & Add to Cart Controls */}
            <div className="space-y-3 pt-2 border-t border-[#E8EBE7]">
              {currentCityStock > 0 ? (
                <div className="flex flex-wrap items-center gap-4">
                  {/* Quantity Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#7C877F]">Quantity:</span>
                    <div className="inline-flex items-center rounded-full bg-[#FAF9F5] border border-[#E8EBE7] p-1">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5 text-[#0A2540]" />
                      </button>
                      <span className="w-10 text-center text-sm font-extrabold text-[#0A2540]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) => Math.min(currentCityStock, q + 1))
                        }
                        disabled={quantity >= currentCityStock}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#0A2540]" />
                      </button>
                    </div>
                    <span className="text-[11px] font-semibold text-[#7C877F]">
                      (Max {currentCityStock} in {city})
                    </span>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="flex-1 flex flex-wrap gap-3 min-w-[260px]">
                    <button
                      type="button"
                      onClick={() => onAddToCart(product, quantity)}
                      className="flex-1 py-3.5 px-6 rounded-full bg-[#0A2540] hover:bg-[#101413] text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#65B99B]" />
                      Add to Cart · ₹{(product.price * quantity).toLocaleString('en-IN')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuyNow(product, quantity)}
                      className="py-3.5 px-6 rounded-full bg-[#064E36] hover:bg-[#103C2D] text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      Checkout Now
                    </button>
                  </div>
                </div>
              ) : (
                /* Out of Stock Disabled State + Clear Explanation */
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled
                      className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#E8EBE7] text-[#7C877F] text-sm font-extrabold flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      Add to Cart Disabled — Out of Stock in {city}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-red-50/70 border border-red-200 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-900 space-y-1">
                      <p className="font-extrabold">
                        Why is Add to Cart disabled?
                      </p>
                      <p className="text-red-800/90 leading-relaxed">
                        <strong>{product.name}</strong> currently has <strong>0 units</strong> available in the{' '}
                        <strong>{city}</strong> fulfillment hub. To prevent failed orders, direct cart addition is disabled for out-of-stock SKUs. You can switch to another city hub above with available stock, or choose an in-stock alternative below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications & Architecture Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-[24px] bg-white border border-[#E8EBE7] p-6 sm:p-8">
          <h2 className="font-display font-black text-lg text-[#0A2540] mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#064E36]" />
            Technical Specifications
          </h2>
          <div className="divide-y divide-[#E8EBE7]">
            {Object.entries(product.specs).map(([key, val]) => (
              <div
                key={key}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
              >
                <span className="font-bold text-[#7C877F] uppercase tracking-wider">
                  {key}
                </span>
                <span className="font-extrabold text-[#0A2540] sm:text-right">
                  {val}
                </span>
              </div>
            ))}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-[#7C877F] uppercase tracking-wider">
                Fulfillment Hub
              </span>
              <span className="font-extrabold text-[#064E36] sm:text-right">
                {city} ({currentHubMeta.hubName})
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-[24px] bg-[#FAF9F5] border border-[#E8EBE7] p-6 sm:p-8 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#064E36] text-white text-[10px] font-extrabold uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5" />
              {city} Hub Delivery
            </span>
            <h3 className="font-display font-black text-xl text-[#0A2540]">
              Fulfilled from {currentHubMeta.hubName}
            </h3>
            <p className="text-xs text-[#202A24]/80 leading-relaxed">
              Orders from the {city} catalog ship with {currentHubMeta.sla} delivery. Stock shown is live for this hub only.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-[#E8EBE7] p-4 space-y-2 text-xs">
            <p className="font-extrabold text-[#0A2540] flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#064E36]" />
              Product details
            </p>
            <ul className="text-[11px] text-[#7C877F] space-y-1 pl-4 list-disc">
              <li>
                Category: <strong className="text-[#0A2540]">{product.category}</strong>
              </li>
              <li>
                SKU: <strong className="text-[#0A2540]">{product.sku}</strong>
              </li>
              <li>
                Available in {city}:{' '}
                <strong className="text-[#0A2540]">
                  {product.cityStock[city] ?? 0} units
                </strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Similar Products in Same Category */}
      {similarProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-xl text-[#0A2540]">
              Similar in {product.category} ({city} Hub)
            </h2>
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-extrabold text-[#064E36] hover:underline cursor-pointer"
            >
              View full catalog →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similarProducts.map((sim) => {
              const simStock = sim.cityStock[city] ?? 0;
              const simBadge = getStockBadgeMeta(simStock);
              return (
                <div
                  key={sim.id}
                  onClick={() => onSelectProduct(sim)}
                  className="rounded-[22px] bg-white border border-[#E8EBE7] p-4 hover:shadow-md hover:border-[#C8E8D9] transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-4/3 rounded-2xl bg-[#FAF9F5] overflow-hidden mb-3 p-3 flex items-center justify-center">
                      <ProductImage
                        src={sim.image}
                        alt={sim.name}
                        category={sim.category}
                        className="w-full h-full object-contain"
                      />
                      <span
                        className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold ${simBadge.pillClass}`}
                      >
                        {simBadge.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-[#7C877F]">
                      {sim.brand}
                    </p>
                    <h4 className="font-display font-bold text-sm text-[#0A2540] line-clamp-1 mt-0.5">
                      {sim.name}
                    </h4>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display font-black text-base text-[#0A2540]">
                      ₹{sim.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] font-extrabold text-[#064E36]">
                      View product →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
