import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Lightbulb,
  ShoppingCart,
  Clock,
  Star,
  TrendingUp,
  PieChart,
  Mail,
  Edit2,
  Package,
  SlidersHorizontal,
  ShieldAlert,
} from 'lucide-react';
import { Product, MerchantTab } from '../../../types/product';
import { motion } from 'framer-motion';
import { useLiveGreeting } from '../../../lib/liveGreeting';

interface StockManagementPageProps {
  products: Product[];
  onAdjustStock: (productId: string, delta: number) => void;
  onEditProduct: (product: Product) => void;
  onNavigateTab?: (tab: MerchantTab) => void;
  merchantName?: string;
}

type AlertFilter = 'all' | 'zero' | 'low' | 'dead_stock';
type TrendRange = '7d' | '30d' | '90d';

export const StockManagementPage: React.FC<StockManagementPageProps> = ({
  products,
  onAdjustStock,
  onEditProduct,
  onNavigateTab,
}) => {
  const [lowThreshold, setLowThreshold] = useState<number>(10);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [trendRange, setTrendRange] = useState<TrendRange>('30d');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);

  // ── Core Stock Classifications ──
  const outOfStockProducts = useMemo(
    () => products.filter((p) => p.stock === 0),
    [products]
  );
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock >= 1 && p.stock <= lowThreshold),
    [products, lowThreshold]
  );
  const healthyProducts = useMemo(
    () => products.filter((p) => p.stock > lowThreshold),
    [products, lowThreshold]
  );

  // Dead stock candidates: high sitting stock (>25 units) or untouched high-value inventory
  const deadStockWatch = useMemo(() => {
    const avgStock =
      products.length > 0
        ? products.reduce((s, p) => s + p.stock, 0) / products.length
        : 0;
    return products
      .filter((p) => p.stock >= Math.max(25, Math.round(avgStock * 1.35)))
      .sort((a, b) => b.stock * b.price - a.stock * a.price)
      .slice(0, 5);
  }, [products]);

  const totalCatalog = products.length || 1;
  const healthRate = products.length
    ? Math.round((healthyProducts.length / totalCatalog) * 100)
    : 100;
  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );

  const alertItems = useMemo(() => {
    if (alertFilter === 'zero') return outOfStockProducts;
    if (alertFilter === 'low') return lowStockProducts;
    if (alertFilter === 'dead_stock') return deadStockWatch;
    return [...outOfStockProducts, ...lowStockProducts];
  }, [alertFilter, outOfStockProducts, lowStockProducts, deadStockWatch]);

  const { greeting, clock } = useLiveGreeting();

  // ── Quick Insights Metrics ──
  const topProduct = useMemo(() => {
    if (products.length === 0) return null;
    return [...products].sort((a, b) => b.stock - a.stock)[0];
  }, [products]);

  const lastUpdatedLabel = useMemo(() => {
    if (products.length === 0) return 'No catalog loaded';
    const latest = [...products].sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )[0];
    try {
      return new Date(latest.lastUpdated).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Just now';
    }
  }, [products]);

  // ── Top Categories Donut Data ──
  const categoryBreakdown = useMemo(() => {
    const palette = ['#064E36', '#65B99B', '#E8C86B', '#CBD5E1'];
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + Math.max(p.stock, 1));
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const grandTotal = sorted.reduce((s, [, v]) => s + v, 0) || 1;

    const top3 = sorted.slice(0, 3).map(([name, val], idx) => ({
      name,
      units: val,
      pct: Math.round((val / grandTotal) * 100),
      color: palette[idx],
    }));

    const restUnits = sorted.slice(3).reduce((s, [, v]) => s + v, 0);
    if (restUnits > 0) {
      const usedPct = top3.reduce((s, c) => s + c.pct, 0);
      top3.push({
        name: 'Others',
        units: restUnits,
        pct: Math.max(1, 100 - usedPct),
        color: palette[3],
      });
    } else if (top3.length > 0) {
      // Ensure percentages sum cleanly to 100%
      const sum = top3.reduce((s, c) => s + c.pct, 0);
      if (sum !== 100) top3[0].pct += 100 - sum;
    }

    return top3;
  }, [products]);

  // ── Inventory Trend Series (Anchored to Live Catalog Units) ──
  const trendSeries = useMemo(() => {
    const baseTotal = Math.max(totalUnits, 120);
    const lowCount = outOfStockProducts.length + lowStockProducts.length;
    const multipliers =
      trendRange === '7d'
        ? [0.78, 0.84, 0.81, 0.9, 0.94, 0.97, 1.0]
        : trendRange === '90d'
        ? [0.45, 0.56, 0.62, 0.7, 0.68, 0.83, 0.79, 0.92, 0.96, 1.0]
        : [0.52, 0.6, 0.58, 0.74, 0.71, 0.85, 0.82, 0.98, 0.95, 1.0];

    const today = new Date();
    const spanDays = trendRange === '7d' ? 7 : trendRange === '90d' ? 90 : 30;

    return multipliers.map((m, i) => {
      const d = new Date(today);
      const offset = Math.round(
        ((multipliers.length - 1 - i) / (multipliers.length - 1)) * spanDays
      );
      d.setDate(today.getDate() - offset);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const totalVal = Math.round(baseTotal * m);
      const lowVal = Math.max(
        lowCount * 4,
        Math.round(totalVal * (0.04 + (i % 3) * 0.015))
      );
      return { label, total: totalVal, low: lowVal };
    });
  }, [totalUnits, outOfStockProducts.length, lowStockProducts.length, trendRange]);

  const formatCompact = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  const buildMailtoHref = (p: Product) => {
    const subject = encodeURIComponent(
      `Restock Request: ${p.name} (${p.sku}) — ${p.location} Hub`
    );
    const body = encodeURIComponent(
      `Hello Supplier Team,\n\nInventory for ${p.name} (SKU: ${p.sku}) at our ${p.location} Hub has reached ${p.stock} units.\n\nPlease confirm dispatch availability for a replenishment order of 25 units.\n\nThank you,\nCelerity Commerce Operations`
    );
    return `mailto:supply@celeritycommerce.in?subject=${subject}&body=${body}`;
  };

  // Donut SVG geometry
  const donutSegments = useMemo(() => {
    const r = 42;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    return categoryBreakdown.map((cat) => {
      const dash = (cat.pct / 100) * circ;
      const seg = {
        ...cat,
        dashArray: `${Math.max(0, dash - 3)} ${circ}`,
        dashOffset: -offset,
      };
      offset += dash;
      return seg;
    });
  }, [categoryBreakdown]);

  // Line chart SVG coordinates
  const chartGeom = useMemo(() => {
    const W = 680;
    const H = 185;
    const padL = 42;
    const padR = 16;
    const padT = 22;
    const padB = 28;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxY = Math.max(...trendSeries.map((d) => d.total), 10) * 1.15;

    const pts = trendSeries.map((d, idx) => {
      const x =
        padL +
        (trendSeries.length > 1 ? (idx / (trendSeries.length - 1)) * plotW : plotW / 2);
      const yTotal = padT + plotH - (d.total / maxY) * plotH;
      const yLow = padT + plotH - (d.low / maxY) * plotH;
      return { ...d, x, yTotal, yLow };
    });

    const totalLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yTotal}`).join(' ');
    const areaPath =
      pts.length > 0
        ? `${totalLine} L${pts[pts.length - 1].x},${padT + plotH} L${pts[0].x},${padT + plotH} Z`
        : '';
    const lowLine = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.yLow}`).join(' ');

    return { W, H, padL, padR, padT, padB, plotH, maxY, pts, totalLine, areaPath, lowLine };
  }, [trendSeries]);

  const activePointIdx =
    hoveredPoint !== null
      ? hoveredPoint
      : Math.max(0, chartGeom.pts.length - 3);
  const activePoint = chartGeom.pts[activePointIdx];

  return (
    <div className="space-y-6">
      {/* ── 1. Hero Header Banner with Ambient Gradient & Illustration ── */}
      <div className="relative overflow-hidden rounded-3xl border border-[#DCEFE3] bg-gradient-to-r from-[#F6FBF7] via-[#EEF7F1] to-[#E3F2E8] p-6 sm:p-8 shadow-2xs">
        {/* Soft decorative ambient blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#C8E8D9]/50 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-16 h-44 w-44 rounded-full bg-[#F5EBCB]/60 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCEFE3] border border-[#064E36]/15 text-xs font-bold text-[#064E36]">
              <span>{greeting}</span>
              <span className="font-semibold tabular-nums text-[#5E6D64]">{clock}</span>
            </div>

            <h1 className="font-display font-black text-2xl sm:text-3xl text-[#202A24] tracking-tight">
              Stock Management &amp; Alert Center
            </h1>
            <p className="text-xs sm:text-sm text-[#5E6D64] font-medium leading-relaxed">
              Monitor your inventory, get real-time alerts, and keep your business running smoothly across all regional hubs.
            </p>

            {/* Threshold Control Pill */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#5E6D64]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#064E36]" />
                Alert Threshold:
              </span>
              {[5, 10, 20].map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => setLowThreshold(th)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    lowThreshold === th
                      ? 'bg-[#064E36] text-white shadow-2xs'
                      : 'bg-white/80 hover:bg-white text-[#202A24] border border-[#E8EBE7]'
                  }`}
                >
                  &le; {th} units
                </button>
              ))}
            </div>
          </div>

          {/* Right Vector Illustration: Warehouse Boxes + Tablet Analytics + Bell */}
          <div className="hidden sm:flex items-center justify-end shrink-0">
            <svg
              viewBox="0 0 280 135"
              className="w-64 h-32 drop-shadow-sm"
              aria-hidden="true"
            >
              {/* Cardboard boxes stack */}
              <g transform="translate(14, 34)">
                <rect x="0" y="42" width="44" height="38" rx="4" fill="#E6C28B" stroke="#C59B62" strokeWidth="1.2" />
                <path d="M16 42 v12 h12 v-12" fill="#D4AA70" />
                <rect x="46" y="48" width="38" height="32" rx="4" fill="#DFB67B" stroke="#C59B62" strokeWidth="1.2" />
                <rect x="20" y="10" width="42" height="34" rx="4" fill="#EED09D" stroke="#C59B62" strokeWidth="1.2" />
                <path d="M35 10 v10 h12 v-10" fill="#D4AA70" />
              </g>

              {/* Tablet Analytics Card */}
              <g transform="translate(115, 16) rotate(-4)">
                <rect x="0" y="0" width="122" height="92" rx="12" fill="#18231E" />
                <rect x="6" y="6" width="110" height="80" rx="8" fill="#FFFFFF" />
                {/* Bars */}
                <rect x="20" y="54" width="12" height="22" rx="3" fill="#C8E8D9" />
                <rect x="38" y="42" width="12" height="34" rx="3" fill="#9ED7B7" />
                <rect x="56" y="34" width="12" height="42" rx="3" fill="#65B99B" />
                <rect x="74" y="24" width="12" height="52" rx="3" fill="#064E36" />
                {/* Trend Arrow */}
                <path
                  d="M18 48 Q45 44 88 18"
                  fill="none"
                  stroke="#10A37F"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M80 17 L90 17 L88 27"
                  fill="none"
                  stroke="#10A37F"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* Notification Bell Badge */}
              <g transform="translate(230, 14)">
                <circle cx="20" cy="20" r="18" fill="#FFF7DF" stroke="#F4E6AA" strokeWidth="1.5" />
                <path
                  d="M20 11 a6 6 0 0 0 -6 6 c0 5 -2 7 -2 7 h16 s-2 -2 -2 -7 a6 6 0 0 0 -6 -6 z"
                  fill="#E5B842"
                />
                <circle cx="20" cy="27" r="2" fill="#BFA028" />
                <circle cx="31" cy="9" r="5" fill="#EF4444" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ── 2. Three KPI Alert Cards (Zero Stock, Low Inventory, Health Score) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Zero Stock SKUs */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setAlertFilter('zero')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF5F5] to-[#FDECEC] border border-red-200/80 p-5 shadow-2xs cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#202A24]">Zero Stock SKUs</p>
                <p className="font-display font-black text-3xl text-red-700 mt-1 leading-none">
                  {outOfStockProducts.length < 10
                    ? `0${outOfStockProducts.length}`
                    : outOfStockProducts.length}
                </p>
                <p
                  className={`text-[11px] font-semibold mt-2 flex items-center gap-1 ${
                    outOfStockProducts.length === 0 ? 'text-[#064E36]' : 'text-red-600'
                  }`}
                >
                  {outOfStockProducts.length === 0 ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>No immediate action required</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Immediate reorder required</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAlertFilter('zero');
              }}
              aria-label="Filter zero stock SKUs"
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-red-200/70 flex items-center justify-center text-red-700 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Card 2: Low Inventory Warning */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setAlertFilter('low')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFFBEB] to-[#FAF1D4] border border-[#E8D58A] p-5 shadow-2xs cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#F5E6B3] border border-[#E8D58A] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#B8860B]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#202A24]">Low Inventory Warning</p>
                <p className="font-display font-black text-3xl text-[#735E18] mt-1 leading-none">
                  {lowStockProducts.length < 10
                    ? `0${lowStockProducts.length}`
                    : lowStockProducts.length}
                </p>
                <p className="text-[11px] font-semibold text-[#8A7120] mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>&le; {lowThreshold} units in local hubs</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAlertFilter('low');
              }}
              aria-label="Filter low inventory SKUs"
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-[#E8D58A] flex items-center justify-center text-[#735E18] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        {/* Card 3: Inventory Health Score */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => onNavigateTab?.('inventory')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F2FBF6] to-[#DCF3E6] border border-[#A8D8BF] p-5 shadow-2xs cursor-pointer transition-all hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#C8E8D9] border border-[#A8D8BF] flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-[#064E36]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#202A24]">Inventory Health Score</p>
                <p className="font-display font-black text-3xl text-[#064E36] mt-1 leading-none">
                  {healthRate}%
                </p>
                <p className="text-[11px] font-semibold text-[#064E36] mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {healthyProducts.length} of {products.length} SKUs optimally stocked
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateTab?.('inventory');
              }}
              aria-label="Open full inventory"
              className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-[#A8D8BF] flex items-center justify-center text-[#064E36] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── 3. Middle Row: Low Stock Warnings (8 cols) + Quick Insights (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Columns: Low Stock & Replenishment Alert Panel */}
        <div className="lg:col-span-8 rounded-2xl bg-white border border-[#E8EBE7] shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-[#E8EBE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#064E36] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-[#202A24]">
                  Low Stock Warnings ({outOfStockProducts.length + lowStockProducts.length})
                </h2>
                <p className="text-[11px] text-[#7C877F]">
                  Monitor critical shortages and slow-moving stock across hubs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  { id: 'all', label: 'Alerts' },
                  { id: 'zero', label: `Zero (${outOfStockProducts.length})` },
                  { id: 'low', label: `Low (${lowStockProducts.length})` },
                  { id: 'dead_stock', label: `Dead Stock Watch (${deadStockWatch.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAlertFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                    alertFilter === tab.id
                      ? 'bg-[#064E36] text-white'
                      : 'bg-[#FAF9F5] hover:bg-[#EAF4EC] text-[#202A24] border border-[#E8EBE7]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => onNavigateTab?.('inventory')}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FAF9F5] hover:bg-[#EAF4EC] border border-[#E8EBE7] text-xs font-bold text-[#202A24] transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Warning Body */}
          <div className="flex-1 p-5 sm:p-6 bg-gradient-to-b from-white via-[#FAFDFB] to-[#F1F8F3]/60">
            {alertItems.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center py-6 space-y-4">
                {/* Centered Illustration matching Reference */}
                <div className="relative w-20 h-20 rounded-2xl bg-[#EAF4EC] border border-[#C8E8D9] flex items-center justify-center shadow-2xs">
                  <Package className="w-9 h-9 text-[#4E9A7F]" />
                  <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#064E36] text-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-[#C8E8D9]" />
                  </span>
                </div>

                <div>
                  <p className="text-sm font-bold text-[#202A24]">
                    {alertFilter === 'dead_stock'
                      ? 'No high-risk slow-moving SKUs detected.'
                      : 'No products are currently running low on stock.'}
                  </p>
                  <p className="text-xs text-[#7C877F] mt-1 max-w-sm mx-auto">
                    {products.length === 0
                      ? 'Upload a product catalog in Inventory to begin automated stock monitoring.'
                      : `All ${products.length} catalog SKUs are above the ${lowThreshold}-unit reorder threshold.`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateTab?.('inventory')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <span>Browse Inventory</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C8E8D9]" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8EBE7] max-h-72 overflow-y-auto pr-1">
                {alertItems.map((p) => {
                  const isDeadStockView = alertFilter === 'dead_stock';
                  const isZero = p.stock === 0;

                  return (
                    <div
                      key={p.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] p-1 shrink-0 overflow-hidden">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm text-[#202A24] truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-[#7C877F] font-mono">
                            {p.sku} · {p.category} · {p.location} Hub
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {isDeadStockView ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F5EBCB] text-[#735E18] border border-[#E8D58A]">
                            {p.stock} units sitting (₹{(p.stock * p.price).toLocaleString('en-IN')})
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isZero
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-[#F5EBCB] text-[#735E18] border-[#E8D58A]'
                            }`}
                          >
                            {isZero ? '0 Units Left' : `${p.stock} Units Left`}
                          </span>
                        )}

                        {!isDeadStockView && (
                          <>
                            <button
                              type="button"
                              onClick={() => onAdjustStock(p.id, isZero ? 20 : 10)}
                              className="px-3 py-1.5 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-[#C8E8D9]" />
                              <span>{isZero ? 'Restock +20' : '+10'}</span>
                            </button>

                            <a
                              href={buildMailtoHref(p)}
                              title="Pre-draft supplier restock email"
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#EAF4EC] border border-[#E8EBE7] text-[11px] font-bold text-[#064E36] flex items-center gap-1 transition-colors"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Supplier</span>
                            </a>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => onEditProduct(p)}
                          title="Edit SKU"
                          className="p-1.5 rounded-xl bg-white hover:bg-[#FAF9F5] border border-[#E8EBE7] text-[#7C877F] hover:text-[#202A24] cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Columns: Quick Insights Card */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-[#E8EBE7] p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E8EBE7]">
            <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] border border-[#E8D58A] flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-[#D97706]" />
            </div>
            <h2 className="font-display font-bold text-base text-[#202A24]">
              Quick Insights
            </h2>
          </div>

          <div className="space-y-3 flex-1">
            {/* Insight 1: Stock Levels */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#DCEFE3] text-[#064E36] flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#202A24]">Stock Levels</p>
                  <p className="text-[11px] text-[#7C877F] truncate">
                    {outOfStockProducts.length + lowStockProducts.length === 0
                      ? 'No critical issues'
                      : `${outOfStockProducts.length + lowStockProducts.length} SKUs need attention`}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  outOfStockProducts.length + lowStockProducts.length === 0
                    ? 'bg-[#DCEFE3] text-[#064E36]'
                    : 'bg-[#F5EBCB] text-[#735E18]'
                }`}
              >
                {outOfStockProducts.length + lowStockProducts.length === 0 ? 'Stable' : 'Action'}
              </span>
            </div>

            {/* Insight 2: Last Updated */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#EAF4EC] text-[#4E9A7F] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#202A24]">Last Updated</p>
                  <p className="text-[11px] text-[#7C877F] truncate">{lastUpdatedLabel}</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCEFE3] text-[#064E36] shrink-0">
                Just now
              </span>
            </div>

            {/* Insight 3: Top Product */}
            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] border border-[#E8D58A]/60 text-[#D97706] flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 fill-[#F4E6AA]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#202A24]">Top Product</p>
                  <p className="text-[11px] font-semibold text-[#202A24] truncate">
                    {topProduct ? topProduct.name : 'Upload catalog'}
                  </p>
                  <p className="text-[10px] text-[#7C877F]">
                    {topProduct ? `${topProduct.stock} units` : '0 units'}
                  </p>
                </div>
              </div>
              {topProduct && (
                <div className="w-10 h-10 rounded-lg bg-white border border-[#E8EBE7] p-1 shrink-0 overflow-hidden">
                  <img
                    src={topProduct.image}
                    alt={topProduct.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                </div>
              )}
            </div>

            {/* Insight 4: Dead Stock Prediction Watch */}
            <div
              onClick={() => setAlertFilter('dead_stock')}
              className="p-3 rounded-xl bg-[#FBF8EC] border border-[#E8D58A]/70 flex items-center justify-between gap-2 cursor-pointer hover:bg-[#FAF4DC] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert className="w-4 h-4 text-[#B8860B] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#202A24]">Dead Stock Watch</p>
                  <p className="text-[10px] text-[#735E18] truncate">
                    {deadStockWatch.length > 0
                      ? `${deadStockWatch.length} overstocked SKUs flagged`
                      : 'Healthy stock turnover'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#735E18] shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Row: Inventory Trend Chart (8 cols) + Top Categories Donut (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Columns: Inventory Trend Area / Line Chart */}
        <div className="lg:col-span-8 rounded-2xl bg-white border border-[#E8EBE7] p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#064E36] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-base text-[#202A24]">
                Inventory Trend
              </h2>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#5E6D64]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#064E36]" />
                  Total Stock
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E5B842]" />
                  Low Stock
                </span>
              </div>

              <select
                value={trendRange}
                onChange={(e) => setTrendRange(e.target.value as TrendRange)}
                aria-label="Trend timeframe"
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8EBE7] text-xs font-bold text-[#202A24] focus:outline-none focus:border-[#064E36] cursor-pointer"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>

          {/* Interactive SVG Line & Area Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
              className="w-full h-48 min-w-[460px] select-none"
            >
              <defs>
                <linearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#65B99B" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#65B99B" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Y Grid Lines & Labels */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = chartGeom.padT + chartGeom.plotH * (1 - ratio);
                const val = Math.round(chartGeom.maxY * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={chartGeom.padL}
                      x2={chartGeom.W - chartGeom.padR}
                      y1={y}
                      y2={y}
                      stroke="#E8EBE7"
                      strokeWidth="1"
                      strokeDasharray={idx === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={chartGeom.padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#7C877F"
                      fontWeight="600"
                    >
                      {formatCompact(val)}
                    </text>
                  </g>
                );
              })}

              {/* Area + Lines */}
              <path d={chartGeom.areaPath} fill="url(#stockAreaGrad)" />
              <path
                d={chartGeom.totalLine}
                fill="none"
                stroke="#064E36"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={chartGeom.lowLine}
                fill="none"
                stroke="#E5B842"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Active Vertical Guide & Tooltip */}
              {activePoint && (
                <g>
                  <line
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={chartGeom.padT}
                    y2={chartGeom.padT + chartGeom.plotH}
                    stroke="#064E36"
                    strokeOpacity="0.25"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={Math.min(Math.max(activePoint.x - 24, chartGeom.padL), chartGeom.W - 64)}
                    y={Math.max(activePoint.yTotal - 28, 2)}
                    width="48"
                    height="20"
                    rx="6"
                    fill="#18231E"
                  />
                  <text
                    x={Math.min(Math.max(activePoint.x, chartGeom.padL + 24), chartGeom.W - 40)}
                    y={Math.max(activePoint.yTotal - 14, 15)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="800"
                    fill="#FFFFFF"
                  >
                    {formatCompact(activePoint.total)}
                  </text>
                </g>
              )}

              {/* Data Points + X Labels */}
              {chartGeom.pts.map((pt, idx) => {
                const isSelected = idx === activePointIdx;
                const showLabel =
                  idx === 0 ||
                  idx === chartGeom.pts.length - 1 ||
                  idx % 2 === 0;
                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(idx)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.yTotal}
                      r={isSelected ? 5 : 3.5}
                      fill={isSelected ? '#064E36' : '#FFFFFF'}
                      stroke="#064E36"
                      strokeWidth="2"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.yLow}
                      r="2.5"
                      fill="#E5B842"
                    />
                    <rect
                      x={pt.x - 18}
                      y={chartGeom.padT}
                      width="36"
                      height={chartGeom.plotH + 20}
                      fill="transparent"
                    />
                    {showLabel && (
                      <text
                        x={pt.x}
                        y={chartGeom.H - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#7C877F"
                        fontWeight="600"
                      >
                        {pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right 4 Columns: Top Categories Donut Breakdown */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-[#E8EBE7] p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8EBE7]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#EAF4EC] text-[#064E36] flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <h2 className="font-display font-bold text-base text-[#202A24]">
                Top Categories
              </h2>
            </div>
            <span className="text-[11px] font-bold text-[#7C877F]">
              {products.length} SKUs
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-xs text-[#7C877F]">
              Upload catalog items to visualize category distribution.
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-1">
              {/* Donut SVG */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90">
                  <circle
                    cx="55"
                    cy="55"
                    r="42"
                    fill="none"
                    stroke="#F3F4F6"
                    strokeWidth="15"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.name}
                      cx="55"
                      cy="55"
                      r="42"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={hoveredCat === seg.name ? '18' : '15'}
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      strokeLinecap="butt"
                      onMouseEnter={() => setHoveredCat(seg.name)}
                      onMouseLeave={() => setHoveredCat(null)}
                      className="transition-all duration-200 cursor-pointer"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="font-display font-black text-base text-[#202A24] leading-none">
                    {totalUnits}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#7C877F] mt-0.5">
                    Units
                  </span>
                </div>
              </div>

              {/* Category Legend */}
              <div className="flex-1 space-y-2.5 min-w-0">
                {categoryBreakdown.map((cat) => (
                  <div
                    key={cat.name}
                    onMouseEnter={() => setHoveredCat(cat.name)}
                    onMouseLeave={() => setHoveredCat(null)}
                    onClick={() => onNavigateTab?.('categories')}
                    className={`flex items-center justify-between gap-2 text-xs p-1 rounded-lg transition-colors cursor-pointer ${
                      hoveredCat === cat.name ? 'bg-[#FAF9F5]' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-[#202A24] truncate">
                        {cat.name}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#202A24] shrink-0">
                      {cat.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
