-- P0: cross-path WhatsApp dedupe locks (API + Kafka share this table)
create table if not exists public.supplier_notify_locks (
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  reason text not null check (reason in ('out_of_stock', 'low_stock')),
  last_notified_at timestamptz not null default now(),
  restock_request_id uuid references public.restock_requests(id) on delete set null,
  last_status text,
  primary key (product_id, store_id, reason)
);

create index if not exists idx_supplier_notify_locks_notified
  on public.supplier_notify_locks (last_notified_at desc);

-- Stub for P1 AI insights (created early so P0 schema is forward-compatible)
create table if not exists public.ai_insight_logs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'insights',
  provider text,
  model text,
  metrics jsonb not null default '{}'::jsonb,
  response text,
  created_at timestamptz not null default now()
);
