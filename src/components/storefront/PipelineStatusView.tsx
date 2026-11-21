import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Database,
  Activity,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  CityName,
  CITIES,
  MultiCityProduct,
  PipelineEventLog,
  getPipelineEvents,
  recordPipelineEvent,
  clearStockOverrides,
  resetPipelineEvents,
} from '../../lib/storefrontCatalog';
import { API_URL } from '../../lib/api';

interface ApiHealthSnapshot {
  ok: boolean;
  database?: { ok: boolean; error?: string };
  kafka?: { configured: boolean; topic?: string };
  opensearch?: { ok: boolean; error?: string };
}

interface PipelineStatusViewProps {
  city: CityName;
  catalog: MultiCityProduct[];
  onBack: () => void;
  onResetStockAndTelemetry: () => void;
}

export const PipelineStatusView: React.FC<PipelineStatusViewProps> = ({
  city,
  catalog,
  onBack,
  onResetStockAndTelemetry,
}) => {
  const [events, setEvents] = useState<PipelineEventLog[]>(() =>
    getPipelineEvents()
  );
  const [liveHealth, setLiveHealth] = useState<ApiHealthSnapshot | null>(null);

  const probeHealth = async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = (await res.json()) as ApiHealthSnapshot;
        setLiveHealth(data);
        return;
      }
      setLiveHealth(null);
    } catch {
      setLiveHealth(null);
    }
  };

  useEffect(() => {
    void probeHealth();
  }, []);

  const totalCityUnits = catalog.reduce(
    (sum, p) => sum + (p.cityStock[city] ?? 0),
    0
  );
  const lowStockCount = catalog.filter(
    (p) => (p.cityStock[city] ?? 0) > 0 && (p.cityStock[city] ?? 0) <= 3
  ).length;
  const zeroStockCount = catalog.filter(
    (p) => (p.cityStock[city] ?? 0) <= 0
  ).length;

  const handleSimulateSync = () => {
    recordPipelineEvent({
      service: 'Apache Kafka',
      topic: 'inventory.changed',
      city,
      summary: `Streamed delta batch for ${city} Hub (${catalog.length} SKUs, ${totalCityUnits} units) → OpenSearch bulk _update`,
      status: 'PUBLISHED',
    });
    recordPipelineEvent({
      service: 'OpenSearch',
      topic: 'catalog.index.refresh',
      city,
      summary: `Refreshed fuzzy ngram & synonym analyzers for ${city} storefront index`,
      status: 'INDEXED',
    });
    setEvents(getPipelineEvents());
  };

  const handleResetAll = () => {
    clearStockOverrides();
    resetPipelineEvents();
    onResetStockAndTelemetry();
    setEvents(getPipelineEvents());
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#E8EBE7] text-xs font-bold text-[#0A2540] hover:bg-[#EAF4EC] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#064E36]" />
          Back to Storefront
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSimulateSync}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-extrabold cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Emit Test Outbox → Kafka Event
          </button>
          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-[#E8EBE7] hover:bg-[#FAF9F5] text-xs font-extrabold text-[#0A2540] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#064E36]" />
            Reset Demo Stock & Telemetry
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="rounded-[28px] bg-[#0A2540] text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#65B99B]/20 text-[#65B99B] text-[11px] font-extrabold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#65B99B] animate-pulse" />
            {liveHealth
              ? 'Live Backend Connected (/api/health)'
              : 'Aiven Data Pipeline Telemetry · Live Session Data'}
          </span>
          <h1 className="font-display font-black text-2xl sm:text-3xl">
            PostgreSQL → Apache Kafka → OpenSearch Flow
          </h1>
          <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
            Real-time observability into how atomic stock locks in PostgreSQL propagate through the Transactional Outbox and Kafka topics to keep OpenSearch storefront availability accurate across{' '}
            <strong>Bengaluru</strong>, <strong>Mumbai</strong>, and <strong>Delhi</strong>.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          {CITIES.map((c) => {
            const units = catalog.reduce(
              (s, p) => s + (p.cityStock[c.name] ?? 0),
              0
            );
            return (
              <div
                key={c.name}
                className={`rounded-2xl p-3.5 border ${
                  c.name === city
                    ? 'bg-[#064E36] border-[#65B99B]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <p className="text-[10px] font-bold uppercase text-white/70">
                  {c.name}
                </p>
                <p className="font-display font-black text-lg text-white mt-0.5">
                  {units}
                </p>
                <p className="text-[10px] text-[#65B99B]">Active Units</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Managed Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: PostgreSQL */}
        <div className="rounded-[24px] bg-white border border-[#E8EBE7] p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#EAF4EC] text-[#064E36] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4EC] text-[#064E36] text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PRIMARY SOT · HEALTHY
            </span>
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-[#0A2540]">
              Aiven for PostgreSQL
            </h3>
            <p className="text-xs text-[#7C877F] mt-1">
              Source of truth for `products`, `inventory`, `orders`, and `outbox_events` with row-level `SELECT ... FOR UPDATE` locking.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E8EBE7] text-xs">
            <div className="rounded-xl bg-[#FAF9F5] p-2.5">
              <p className="text-[10px] text-[#7C877F] font-bold">Tracked SKUs</p>
              <p className="font-display font-black text-base text-[#0A2540]">
                {catalog.length}
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF9F5] p-2.5">
              <p className="text-[10px] text-[#7C877F] font-bold">
                {city} OOS / Low
              </p>
              <p className="font-display font-black text-base text-[#064E36]">
                {zeroStockCount} OOS · {lowStockCount} Low
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Apache Kafka */}
        <div className="rounded-[24px] bg-white border border-[#E8EBE7] p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#F5EBCB] text-[#7A5800] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4EC] text-[#064E36] text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              STREAMING · 0 LAG
            </span>
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-[#0A2540]">
              Aiven for Apache Kafka
            </h3>
            <p className="text-xs text-[#7C877F] mt-1">
              Decouples transactional checkout from search indexing via `inventory.changed` and `restock.requested` topics.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E8EBE7] text-xs">
            <div className="rounded-xl bg-[#FAF9F5] p-2.5">
              <p className="text-[10px] text-[#7C877F] font-bold">Active Topics</p>
              <p className="font-display font-black text-sm text-[#0A2540]">
                2 Topics
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF9F5] p-2.5">
              <p className="text-[10px] text-[#7C877F] font-bold">Events Logged</p>
              <p className="font-display font-black text-base text-[#064E36]">
                {events.length}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: OpenSearch */}
        <div className="rounded-[24px] bg-white border border-[#E8EBE7] p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-[#EAF4EC] text-[#064E36] flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4EC] text-[#064E36] text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              INDEXED · FUZZY ON
            </span>
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-[#0A2540]">
              Aiven for OpenSearch
            </h3>
            <p className="text-xs text-[#7C877F] mt-1">
              Powers typo-tolerant search (`&quot;lapto&quot; → &quot;laptop&quot;`), multi-city facets, and deterministic ±20% Smart Basket Rescue queries.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E8EBE7] text-xs">
            <div className="rounded-xl bg-[#FAF9F5] p-2.5">
              <p className="text-[10px] text-[#7C877F] font-bold">Indexed Docs</p>
              <p className="font-display font-black text-base text-[#0A2540]">
                {catalog.length * 3} City Docs
              </p>
            </div>
            <div className="rounded-xl bg-[#FAF9F5] p-2.5">
              <p className="text-[10px] text-[#7C877F] font-bold">Query Latency</p>
              <p className="font-display font-black text-base text-[#064E36]">
                ~11 ms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Stage Architecture Pipeline Diagram */}
      <div className="rounded-[28px] bg-white border border-[#E8EBE7] p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-black text-lg text-[#0A2540] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#064E36]" />
            End-to-End Event-Driven Architecture Flow
          </h2>
          <span className="text-xs font-bold text-[#7C877F]">
            Transactional Outbox Pattern · Idempotent Version Checks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            {
              step: '01',
              title: 'PostgreSQL Lock',
              tech: 'SELECT ... FOR UPDATE',
              desc: 'Locks city inventory row during checkout. Returns HTTP 409 if stock is 0.',
            },
            {
              step: '02',
              title: 'Transactional Outbox',
              tech: 'outbox_events table',
              desc: 'Writes order + stock delta event in the same ACID database transaction.',
            },
            {
              step: '03',
              title: 'Apache Kafka',
              tech: 'inventory.changed',
              desc: 'Outbox publisher streams events keyed by product_id:city to preserve order.',
            },
            {
              step: '04',
              title: 'Sync & Restock Workers',
              tech: 'Consumer Groups',
              desc: 'Applies versioned updates and triggers restock.requested when stock < threshold.',
            },
            {
              step: '05',
              title: 'OpenSearch Storefront',
              tech: 'Fuzzy + Rescue Index',
              desc: 'Updates city stock badges and serves ±20% Smart Basket Rescue alternatives.',
            },
          ].map((node, i) => (
            <div
              key={node.step}
              className="relative rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#0A2540] text-white text-[10px] font-black">
                    STAGE {node.step}
                  </span>
                  {i < 4 && (
                    <ArrowRight className="w-4 h-4 text-[#064E36] hidden md:block" />
                  )}
                </div>
                <h4 className="font-display font-extrabold text-sm text-[#0A2540]">
                  {node.title}
                </h4>
                <p className="text-[11px] font-bold text-[#064E36] mt-0.5">
                  {node.tech}
                </p>
              </div>
              <p className="text-[11px] text-[#7C877F] mt-2 leading-relaxed">
                {node.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Pipeline Event Stream Table */}
      <div className="rounded-[28px] bg-white border border-[#E8EBE7] p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display font-black text-lg text-[#0A2540]">
              Live Pipeline Event Stream
            </h2>
            <p className="text-xs text-[#7C877F]">
              Every checkout, stock conflict (HTTP 409), Smart Basket Rescue swap, and city switch appends to this stream in real time.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#EAF4EC] text-[#064E36] text-xs font-extrabold">
            {events.length} Recent Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8EBE7] text-[10px] font-extrabold uppercase tracking-wider text-[#7C877F]">
                <th className="py-3 px-3">Event ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3">Topic / Operation</th>
                <th className="py-3 px-3">City Hub</th>
                <th className="py-3 px-3">Payload Summary</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EBE7] text-xs">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#FAF9F5]">
                  <td className="py-3 px-3 font-mono font-bold text-[#0A2540]">
                    {evt.id}
                  </td>
                  <td className="py-3 px-3 text-[#7C877F] whitespace-nowrap">
                    {evt.timestamp}
                  </td>
                  <td className="py-3 px-3 font-extrabold text-[#0A2540]">
                    {evt.service}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-[#064E36]">
                    {evt.topic}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#0A2540]">
                    {evt.city}
                  </td>
                  <td className="py-3 px-3 text-[#202A24]/80 max-w-md">
                    {evt.summary}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        evt.status === 'CONFLICT_409'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : evt.status === 'COMMITTED'
                            ? 'bg-[#EAF4EC] text-[#064E36] border border-[#C8E8D9]'
                            : 'bg-[#F5EBCB] text-[#7A5800] border border-[#E8C86B]'
                      }`}
                    >
                      {evt.status === 'CONFLICT_409' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <ShieldCheck className="w-3 h-3" />
                      )}
                      {evt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
