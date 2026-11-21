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
