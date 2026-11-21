import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export const OrdersAdminPage: React.FC = () => {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    api<{ orders: Array<Record<string, unknown>> }>('/api/admin/orders')
      .then((r) => setOrders(r.orders || []))
      .catch(() => setOrders([]));
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-[#0A2540]">Orders</h1>
      {!orders.length ? (
        <p className="text-sm text-[#7C877F]">No orders yet.</p>
      ) : (
        <div className="rounded-2xl bg-white border border-[#E8EBE7] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F5] text-[#7C877F]">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">City</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={String(o.id)} className="border-t border-[#E8EBE7]">
                  <td className="p-3 font-mono">{String(o.id).slice(0, 8)}</td>
                  <td className="p-3">{String(o.email || o.full_name || '')}</td>
                  <td className="p-3">{String(o.city)}</td>
                  <td className="p-3">₹{Number(o.total).toLocaleString('en-IN')}</td>
                  <td className="p-3">{String(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const DeadStockPage: React.FC = () => {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [days, setDays] = useState(30);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    setError(null);
    api<{ items: Array<Record<string, unknown>>; days: number }>(
      `/api/admin/dead-stock?days=${days}`
    )
      .then((r) => {
        setItems(r.items || []);
        if (r.days) setDays(r.days);
      })
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Failed to load dead stock');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const explain = async () => {
    if (!items.length) {
      setExplanation('No dead-stock rows to explain. Wait for inventory that has not sold.');
      return;
    }
    setBusy(true);
    setExplanation(null);
    try {
      const summary = items
        .slice(0, 25)
        .map(
          (i) =>
            `${i.sku} | ${i.name} @ ${i.city}: stock=${i.stock}, days_idle=${i.days_since_sale}${
              i.never_sold ? ' (never sold)' : ''
            }, value=₹${i.inventory_value}`
        )
        .join('\n');
      const res = await api<{
        explanation: string | null;
        error?: string;
        model?: string;
        provider?: string;
        attempts?: Array<{ provider: string; error: string }>;
      }>('/api/admin/dead-stock/explain', {
        method: 'POST',
        body: JSON.stringify({ summary }),
      });
      if (res.explanation) {
        const tag = [res.provider, res.model].filter(Boolean).join(' · ');
        setExplanation(`${tag ? `[${tag}]\n\n` : ''}${res.explanation}`);
      } else {
        const attempts = res.attempts?.map((a) => `${a.provider}: ${a.error}`).join('\n');
        setExplanation(res.error || attempts || 'No explanation returned');
      }
    } catch (err) {
      setExplanation(err instanceof Error ? err.message : 'Explain failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0A2540]">Dead stock</h1>
          <p className="text-xs text-[#7C877F] mt-1">
            SKUs with stock &gt; 0 and no sale for {days}+ days (or never sold). Auto-refreshes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="px-3 py-2 rounded-xl bg-white border border-[#E8EBE7] text-[#0A2540] text-xs font-bold cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={explain}
            disabled={busy}
            className="px-3 py-2 rounded-xl bg-[#0A2540] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Asking AI…' : 'Explain with AI'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {explanation && (
        <pre className="whitespace-pre-wrap text-xs bg-white border border-[#E8EBE7] rounded-2xl p-4">
          {explanation}
        </pre>
      )}
      {loading && !items.length ? (
        <p className="text-sm text-[#7C877F]">Loading dead stock…</p>
      ) : !items.length ? (
        <p className="text-sm text-[#7C877F]">
          No dead-stock SKUs under the {days}-day inactivity window.
        </p>
      ) : (
        <div className="rounded-2xl bg-white border border-[#E8EBE7] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-[#FAF9F5] text-[#7C877F]">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Product</th>
                <th className="p-3">City</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Days idle</th>
                <th className="p-3">Value</th>
                <th className="p-3">Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={`${i.id}-${i.city}-${idx}`} className="border-t border-[#E8EBE7]">
                  <td className="p-3 font-mono">{String(i.sku)}</td>
                  <td className="p-3">{String(i.name)}</td>
                  <td className="p-3">{String(i.city)}</td>
                  <td className="p-3 font-bold">{String(i.stock)}</td>
                  <td className="p-3">
                    {String(i.days_since_sale ?? 0)}
                    {i.never_sold ? ' · never sold' : ''}
                  </td>
                  <td className="p-3">₹{Number(i.inventory_value || 0).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-[#7C877F]">{String(i.reason || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

type SupplierSubTab = 'directory' | 'logs';

function statusBadgeClass(status: string) {
  if (status === 'submitted' || status === 'delivered') return 'bg-emerald-50 text-emerald-800';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'pending_configuration') return 'bg-amber-50 text-amber-800';
  return 'bg-[#FAF9F5] text-[#7C877F]';
}

export const SuppliersPage: React.FC = () => {
  const [subTab, setSubTab] = useState<SupplierSubTab>('directory');
  const [suppliers, setSuppliers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [logItems, setLogItems] = useState<Array<Record<string, unknown>>>([]);
  const [logError, setLogError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ suppliers: Array<Record<string, unknown>> }>('/api/admin/suppliers')
      .then((r) => {
        if (!cancelled) setSuppliers(r.suppliers || []);
      })
      .catch(() => {
        if (!cancelled) setSuppliers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshLogs = () =>
    api<{ notifications: Array<Record<string, unknown>> }>('/api/admin/notifications')
      .then((r) => {
        setLogItems(r.notifications || []);
        setLogError(null);
      })
      .catch((err) => {
        setLogItems([]);
        setLogError(err instanceof Error ? err.message : 'Failed to load supplier logs');
      });

  useEffect(() => {
    if (subTab !== 'logs') return;
    refreshLogs();
    const id = setInterval(refreshLogs, 20_000);
    return () => clearInterval(id);
  }, [subTab]);

  const canRetry = (status: string) => status === 'failed' || status === 'pending_configuration';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black text-[#0A2540]">Suppliers</h1>
        <p className="text-xs text-[#7C877F] mt-1 max-w-2xl">
          Directory of supplier contacts and WhatsApp notification logs for stockout alerts.
        </p>
      </div>

      <div className="inline-flex p-1 rounded-2xl bg-[#FAF9F5] border border-[#E8EBE7] gap-1">
        {(
          [
            { id: 'directory' as const, label: 'Directory' },
            { id: 'logs' as const, label: 'Supplier Logs' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
              subTab === t.id
                ? 'bg-[#0A2540] text-white shadow-sm'
                : 'text-[#5E6D64] hover:bg-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'directory' && (
        <>
          {loading ? (
            <p className="text-sm text-[#7C877F]">Loading suppliers…</p>
          ) : !suppliers.length ? (
            <div className="rounded-2xl border border-dashed border-[#E8EBE7] bg-white px-5 py-10 text-center">
              <p className="text-sm font-bold text-[#0A2540]">No suppliers yet</p>
              <p className="text-xs text-[#7C877F] mt-1">
                Add supplier name and phone on the product form or via catalog CSV/Excel import.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suppliers.map((s) => {
                const name = String(s.name || 'Unnamed supplier');
                const phone = String(s.whatsapp_e164 || s.phone || '').trim();
                const initial = name.trim().charAt(0).toUpperCase() || 'S';
                return (
                  <li
                    key={String(s.id)}
                    className="rounded-2xl bg-white border border-[#E8EBE7] p-4 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#EAF4EC] border border-[#C8E8D9] flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-[#064E36]">{initial}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-sm text-[#0A2540] truncate">
                        {name}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C877F]">
                          WhatsApp
                        </span>
                        {phone ? (
                          <span className="text-xs font-semibold text-[#0A2540] font-mono tracking-tight">
                            {phone}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">No number on file</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {subTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#7C877F]">
              Template-only WhatsApp logs. Retry is available for failed sends only.
            </p>
            <button
              type="button"
              onClick={() => refreshLogs()}
              className="px-3 py-2 rounded-xl bg-white border border-[#E8EBE7] text-[#0A2540] text-xs font-bold cursor-pointer"
            >
              Refresh
            </button>
          </div>
          {logError && <p className="text-xs text-red-600">{logError}</p>}
          {!logItems.length ? (
            <p className="text-sm text-[#7C877F]">No notification logs.</p>
          ) : (
            <div className="space-y-2">
              {logItems.map((n) => {
                const status = String(n.status || '');
                const when = n.created_at
                  ? new Date(String(n.created_at)).toLocaleString('en-IN')
                  : '';
                return (
                  <div
                    key={String(n.id)}
                    className="rounded-xl bg-white border border-[#E8EBE7] p-3 text-xs flex justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold ${statusBadgeClass(status)}`}
                        >
                          {status}
                        </span>
                        <span className="font-mono text-[#0A2540]">{String(n.sku || '—')}</span>
                        <span className="text-[#7C877F]">{String(n.city || '')}</span>
                      </div>
                      <p className="font-bold text-[#0A2540] truncate">
                        {String(n.product_name || 'Unknown product')}
                        {n.supplier_name ? ` → ${String(n.supplier_name)}` : ''}
                      </p>
                      <p className="text-[#7C877F]">
                        {String(n.failure_reason || n.provider_message_id || '—')}
                      </p>
                      <p className="text-[#7C877F]">{when}</p>
                    </div>
                    {canRetry(status) && (
                      <button
                        type="button"
                        disabled={retrying === String(n.id)}
                        className="shrink-0 px-2 py-1 h-fit rounded-lg bg-[#0A2540] text-white font-bold cursor-pointer disabled:opacity-60"
                        onClick={async () => {
                          setRetrying(String(n.id));
                          setLogError(null);
                          try {
                            await api(`/api/admin/notifications/${n.id}/retry`, {
                              method: 'POST',
                            });
                            await refreshLogs();
                          } catch (err) {
                            setLogError(err instanceof Error ? err.message : 'Retry failed');
                          } finally {
                            setRetrying(null);
                          }
                        }}
                      >
                        {retrying === String(n.id) ? 'Retrying…' : 'Retry'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
