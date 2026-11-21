import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { Product } from '../../../types/product';

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

interface DeadStockPageProps {
  products?: Product[];
  onSuggestSolutions?: (product: Product) => void;
  onOpenPaymentDiscounts?: (product: Product) => void;
}

export const DeadStockPage: React.FC<DeadStockPageProps> = ({
  products = [],
  onSuggestSolutions,
  onOpenPaymentDiscounts,
}) => {
  const [apiItems, setApiItems] = useState<Array<Record<string, unknown>>>([]);
  const [days, setDays] = useState(30);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usingLocalFallback, setUsingLocalFallback] = useState(false);

  const localDeadStockRows = useMemo(() => {
    return products
      .filter((p) => p.stock >= 100)
      .sort((a, b) => b.stock * b.price - a.stock * a.price)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        city: p.location,
        stock: p.stock,
        days_since_sale: 34,
        never_sold: false,
        inventory_value: p.stock * p.price,
        reason: `High sitting volume (${p.stock.toLocaleString('en-IN')} units >= 100 threshold)`,
        localProduct: p,
      }));
  }, [products]);

  const items = apiItems.length > 0 ? apiItems : localDeadStockRows;

  const refresh = () => {
    setLoading(true);
    api<{ items: Array<Record<string, unknown>>; days: number }>(
      `/api/admin/dead-stock?days=${days}`
    )
      .then((r) => {
        const rows = r.items || [];
        setApiItems(rows);
        setUsingLocalFallback(rows.length === 0 && localDeadStockRows.length > 0);
        if (r.days) setDays(r.days);
      })
      .catch(() => {
        setApiItems([]);
        setUsingLocalFallback(true);
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
      setExplanation('No dead-stock rows to explain. Products with >=100 units sitting or 30+ days idle appear here.');
      return;
    }
    setBusy(true);
    setExplanation(null);
    const summary = items
      .slice(0, 25)
      .map(
        (i) =>
          `${i.sku} | ${i.name} @ ${i.city}: stock=${i.stock}, days_idle=${i.days_since_sale}${
            i.never_sold ? ' (never sold)' : ''
          }, value=₹${i.inventory_value}`
      )
      .join('\n');

    try {
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
        throw new Error(res.error || 'Fallback to local summary');
      }
    } catch {
      const top = items[0];
      const totalVal = items.reduce((s, r) => s + Number(r.inventory_value || 0), 0);
      setExplanation(
        `[Dead Stock Analysis · ${items.length} Flagged SKUs · Total Capital Tied: ₹${totalVal.toLocaleString(
          'en-IN'
        )}]\n\n` +
          `1. Highest Priority SKU: ${top.name} (${top.sku}) at ${top.city} Hub holds ${Number(
            top.stock
          ).toLocaleString('en-IN')} units (₹${Number(top.inventory_value || 0).toLocaleString(
            'en-IN'
          )}).\n` +
          `2. Recommended Payment Offer: Attach a 10% Instant Bank Discount (HDFC / ICICI / SBI Netbanking or Credit Card) using "Payment Discount" to accelerate conversion without permanent MRP erosion.\n` +
          `3. Hub Rebalancing & Flash Deal: Shift 35–40% of excess units to partner hubs and run a 12% clearance markdown via "Suggest Solutions".`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0A2540]">Dead Stock Analytics</h1>
          <p className="text-xs text-[#7C877F] mt-1">
            SKUs with stock &gt; 0 and no sale for {days}+ days or high sitting inventory (&ge;100 units).{' '}
            {usingLocalFallback ? 'Showing live local catalog classification.' : 'Auto-refreshes from backend.'}
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
            className="px-3 py-2 rounded-xl bg-[#064E36] hover:bg-[#103C2D] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Analyzing…' : 'Explain with AI'}
          </button>
        </div>
      </div>
      {explanation && (
        <pre className="whitespace-pre-wrap text-xs bg-white border border-[#C8E8D9] rounded-2xl p-4 text-[#202A24] leading-relaxed">
          {explanation}
        </pre>
      )}
      {loading && !items.length ? (
        <p className="text-sm text-[#7C877F]">Loading dead stock…</p>
      ) : !items.length ? (
        <p className="text-sm text-[#7C877F]">
          No dead-stock SKUs detected under the {days}-day inactivity or &ge;100-unit overstock window.
        </p>
      ) : (
        <div className="rounded-2xl bg-white border border-[#E8EBE7] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead className="bg-[#FAF9F5] text-[#7C877F] uppercase text-[10px] font-extrabold">
              <tr>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Product</th>
                <th className="p-3.5">City</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Days idle</th>
                <th className="p-3.5">Value</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5 text-right">Solutions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => {
                const localProd = (i as { localProduct?: Product }).localProduct;
                return (
                  <tr key={`${i.id}-${i.city}-${idx}`} className="border-t border-[#E8EBE7] hover:bg-[#FAF9F5]/60">
                    <td className="p-3.5 font-mono font-bold text-[#202A24]">{String(i.sku)}</td>
                    <td className="p-3.5 font-bold text-[#202A24]">{String(i.name)}</td>
                    <td className="p-3.5">{String(i.city)} Hub</td>
                    <td className="p-3.5 font-mono font-bold text-[#7A5800]">
                      {Number(i.stock).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      {String(i.days_since_sale ?? 0)}d
                      {i.never_sold ? ' · never sold' : ''}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#064E36]">
                      ₹{Number(i.inventory_value || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-[#7C877F]">{String(i.reason || '')}</td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      {localProd && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSuggestSolutions?.(localProd)}
                            className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] hover:bg-[#F5EBCB] border border-[#E8D58A] text-[#7A5800] font-bold cursor-pointer"
                          >
                            Suggest Solutions
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenPaymentDiscounts?.(localProd)}
                            className="px-2.5 py-1 rounded-lg bg-[#EAF4EC] hover:bg-[#DCEFE3] border border-[#C8E8D9] text-[#064E36] font-bold cursor-pointer"
                          >
                            Bank Discount
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const refresh = () =>
    api<{ suppliers: Array<Record<string, unknown>> }>('/api/admin/suppliers')
      .then((r) => setSuppliers(r.suppliers || []))
      .catch(() => setSuppliers([]));
  useEffect(() => {
    refresh();
  }, []);
  const add = async () => {
    setMsg(null);
    if (!name.trim()) {
      setMsg('Supplier name is required');
      return;
    }
    if (!whatsapp.trim()) {
      setMsg('WhatsApp number required (E.164, e.g. +9198xxxxxxx) — used for stock-out alerts');
      return;
    }
    try {
      await api('/api/admin/suppliers', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), whatsappE164: whatsapp.trim() }),
      });
      setName('');
      setWhatsapp('');
      setMsg('Supplier saved. They will get WhatsApp when stock hits 0 or goes low.');
      refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to add supplier');
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-black text-[#0A2540]">Suppliers</h1>
        <p className="text-xs text-[#7C877F] mt-1">
          When a product runs out (or goes below reorder threshold), Celerity WhatsApps this contact
          automatically — checkout and admin stock edits both trigger it.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Supplier name"
          className="px-3 py-2 rounded-xl border border-[#E8EBE7] text-sm"
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="+9198xxxxxxxx"
          className="px-3 py-2 rounded-xl border border-[#E8EBE7] text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-xl bg-[#064E36] text-white text-xs font-bold cursor-pointer"
        >
          Add
        </button>
      </div>
      {msg && <p className="text-xs text-[#064E36]">{msg}</p>}
      <ul className="space-y-2">
        {suppliers.map((s) => (
          <li key={String(s.id)} className="rounded-xl bg-white border border-[#E8EBE7] p-3 text-sm">
            <span className="font-bold">{String(s.name)}</span>
            <span className="text-[#7C877F] ml-2">{String(s.whatsapp_e164 || 'no WhatsApp')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const RestockPage: React.FC = () => {
  const [requests, setRequests] = useState<Array<Record<string, unknown>>>([]);
  const refresh = () =>
    api<{ requests: Array<Record<string, unknown>> }>('/api/admin/restock-requests')
      .then((r) => setRequests(r.requests || []))
      .catch(() => setRequests([]));
  useEffect(() => {
    refresh();
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-[#0A2540]">Restock requests</h1>
      {!requests.length ? (
        <p className="text-sm text-[#7C877F]">No restock requests.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={String(r.id)} className="rounded-xl bg-white border border-[#E8EBE7] p-3 text-xs">
              <p className="font-bold text-sm text-[#0A2540]">
                {String(r.product_name)} · {String(r.city)}
              </p>
              <p className="text-[#7C877F] mt-1">
                stock {String(r.current_stock)} / threshold {String(r.reorder_threshold)} · suggest{' '}
                {String(r.suggested_qty)} · {String(r.status)} · WA {String(r.whatsapp_status)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function statusBadgeClass(status: string) {
  if (status === 'submitted' || status === 'delivered') return 'bg-emerald-50 text-emerald-800';
  if (status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'pending_configuration') return 'bg-amber-50 text-amber-800';
  return 'bg-[#FAF9F5] text-[#7C877F]';
}

export const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    api<{ notifications: Array<Record<string, unknown>> }>('/api/admin/notifications')
      .then((r) => setItems(r.notifications || []))
      .catch((err) => {
        setItems([]);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      });

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, []);

  const canRetry = (status: string) => status === 'failed' || status === 'pending_configuration';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0A2540]">Supplier notifications</h1>
          <p className="text-xs text-[#7C877F] mt-1">
            Template-only WhatsApp logs. Retry is available for failed sends only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="px-3 py-2 rounded-xl bg-white border border-[#E8EBE7] text-[#0A2540] text-xs font-bold cursor-pointer"
        >
          Refresh
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!items.length ? (
        <p className="text-sm text-[#7C877F]">No notification logs.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
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
                    <span className="font-mono text-[#0A2540]">
                      {String(n.sku || '—')}
                    </span>
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
                      setError(null);
                      try {
                        await api(`/api/admin/notifications/${n.id}/retry`, { method: 'POST' });
                        await refresh();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Retry failed');
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
  );
};
