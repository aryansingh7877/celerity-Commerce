-- ==============================================================================
-- CELERITY COMMERCE — BACKEND PIPELINE
-- Outbox events, inventory audit, restock desk, checkout + alternatives RPCs
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. INVENTORY EVENTS (append-only stock telemetry)
-- ------------------------------------------------------------------------------
create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  previous_qty integer not null,
  new_qty integer not null,
  delta integer not null,
  reason text not null default 'adjust'
    check (reason in ('adjust', 'checkout', 'restock', 'seed', 'simulate')),
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_events_product
  on public.inventory_events(product_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 2. TRANSACTIONAL OUTBOX (pipeline bus)
-- ------------------------------------------------------------------------------
create table if not exists public.outbox (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'published', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_outbox_pending
  on public.outbox(status, created_at)
  where status = 'pending';

-- ------------------------------------------------------------------------------
-- 3. RESTOCK REQUESTS (merchant replenishment desk)
-- ------------------------------------------------------------------------------
create table if not exists public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  requested_qty integer not null default 10 check (requested_qty > 0),
  status text not null default 'open'
    check (status in ('open', 'ordered', 'received', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_restock_open
  on public.restock_requests(status, created_at desc);

-- ------------------------------------------------------------------------------
-- 4. HELPER: enqueue outbox row
-- ------------------------------------------------------------------------------
create or replace function public.enqueue_outbox(p_topic text, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.outbox (topic, payload)
  values (p_topic, coalesce(p_payload, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- ------------------------------------------------------------------------------
-- 5. TRIGGER: inventory change → event + outbox (+ auto restock when low)
-- ------------------------------------------------------------------------------
create or replace function public.on_inventory_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer;
  v_reason text;
begin
  v_delta := new.stock_quantity - old.stock_quantity;
  if v_delta = 0 then
    return new;
  end if;

  v_reason := coalesce(nullif(current_setting('celerity.inventory_reason', true), ''), 'adjust');

  insert into public.inventory_events (
    product_id, store_id, previous_qty, new_qty, delta, reason
  ) values (
    new.product_id, new.store_id, old.stock_quantity, new.stock_quantity, v_delta, v_reason
  );

  perform public.enqueue_outbox(
    'inventory.changed',
    jsonb_build_object(
      'product_id', new.product_id,
      'store_id', new.store_id,
      'previous_qty', old.stock_quantity,
      'new_qty', new.stock_quantity,
      'delta', v_delta,
      'reason', v_reason
    )
  );

  -- Auto-open restock ticket when stock drops below 3
  if new.stock_quantity < 3 and old.stock_quantity >= 3 then
    insert into public.restock_requests (product_id, store_id, requested_qty, notes)
    values (
      new.product_id,
      new.store_id,
      greatest(10, 3 - new.stock_quantity),
      'Auto-created by inventory pipeline (stock < 3)'
    );
    perform public.enqueue_outbox(
      'restock.requested',
      jsonb_build_object(
        'product_id', new.product_id,
        'store_id', new.store_id,
        'stock_quantity', new.stock_quantity
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_inventory_changed on public.inventory;
create trigger trg_inventory_changed
  after update of stock_quantity on public.inventory
  for each row execute function public.on_inventory_changed();

-- ------------------------------------------------------------------------------
-- 6. RPC: adjust inventory (merchant / edge function)
-- ------------------------------------------------------------------------------
create or replace function public.adjust_inventory(
  p_product_id uuid,
  p_store_id uuid,
  p_delta integer,
  p_reason text default 'adjust',
  p_actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.inventory%rowtype;
  v_new integer;
begin
  if p_delta = 0 then
    raise exception 'delta must be non-zero';
  end if;

  perform set_config('celerity.inventory_reason', coalesce(p_reason, 'adjust'), true);

  select * into v_row
  from public.inventory
  where product_id = p_product_id and store_id = p_store_id
  for update;

  if not found then
    if p_delta < 0 then
      raise exception 'inventory row not found';
    end if;
    insert into public.inventory (product_id, store_id, stock_quantity)
    values (p_product_id, p_store_id, p_delta)
    returning * into v_row;

    insert into public.inventory_events (
      product_id, store_id, previous_qty, new_qty, delta, reason, actor_id
    ) values (
      p_product_id, p_store_id, 0, p_delta, p_delta, coalesce(p_reason, 'adjust'), p_actor_id
    );

    perform public.enqueue_outbox(
      'inventory.changed',
      jsonb_build_object(
        'product_id', p_product_id,
        'store_id', p_store_id,
        'previous_qty', 0,
        'new_qty', p_delta,
        'delta', p_delta,
        'reason', coalesce(p_reason, 'adjust')
      )
    );

    return jsonb_build_object(
      'success', true,
      'product_id', p_product_id,
      'store_id', p_store_id,
      'stock_quantity', p_delta
    );
  end if;

  v_new := v_row.stock_quantity + p_delta;
  if v_new < 0 then
    raise exception 'insufficient stock';
  end if;

  update public.inventory
  set stock_quantity = v_new, updated_at = now()
  where id = v_row.id;

  -- stamp actor on the latest event if present
  if p_actor_id is not null then
    update public.inventory_events
    set actor_id = p_actor_id
    where product_id = p_product_id
      and store_id = p_store_id
      and created_at >= now() - interval '2 seconds'
      and actor_id is null;
  end if;

  return jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'store_id', p_store_id,
    'stock_quantity', v_new
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 7. RPC: checkout basket (atomic stock reservation + rescue payload)
-- ------------------------------------------------------------------------------
create or replace function public.checkout_basket(
  p_basket_id uuid,
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_basket public.baskets%rowtype;
  v_item record;
  v_stock integer;
  v_conflicts jsonb := '[]'::jsonb;
  v_alternatives jsonb;
  v_ok boolean := true;
begin
  select * into v_basket from public.baskets where id = p_basket_id for update;
  if not found then
    raise exception 'basket not found';
  end if;

  if auth.uid() is not null and v_basket.user_id <> auth.uid() then
    raise exception 'not your basket';
  end if;

  for v_item in
    select bi.*, p.name as product_name, p.category, p.price as catalog_price
    from public.basket_items bi
    join public.products p on p.id = bi.product_id
    where bi.basket_id = p_basket_id
  loop
    select stock_quantity into v_stock
    from public.inventory
    where product_id = v_item.product_id and store_id = p_store_id
    for update;

    v_stock := coalesce(v_stock, 0);

    if v_stock < v_item.quantity then
      v_ok := false;

      select coalesce(jsonb_agg(jsonb_build_object(
        'product_id', alt.id,
        'name', alt.name,
        'price', alt.price,
        'image_url', alt.image_url,
        'stock_quantity', inv.stock_quantity,
        'store_id', inv.store_id
      ) order by abs(alt.price - v_item.catalog_price), inv.stock_quantity desc), '[]'::jsonb)
      into v_alternatives
      from public.products alt
      join public.inventory inv on inv.product_id = alt.id
      where alt.category = v_item.category
        and alt.id <> v_item.product_id
        and inv.stock_quantity > 0
      limit 5;

      v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
        'product_id', v_item.product_id,
        'name', v_item.product_name,
        'requested', v_item.quantity,
        'available', v_stock,
        'alternatives', v_alternatives
      ));
    end if;
  end loop;

  if not v_ok then
    perform public.enqueue_outbox(
      'checkout.conflict',
      jsonb_build_object(
        'basket_id', p_basket_id,
        'store_id', p_store_id,
        'conflicts', v_conflicts
      )
    );
    return jsonb_build_object(
      'success', false,
      'code', 'STOCK_CONFLICT',
      'message', 'One or more items are unavailable — Smart Basket Rescue ready',
      'conflicts', v_conflicts
    );
  end if;

  perform set_config('celerity.inventory_reason', 'checkout', true);

  for v_item in
    select * from public.basket_items where basket_id = p_basket_id
  loop
    update public.inventory
    set stock_quantity = stock_quantity - v_item.quantity,
        updated_at = now()
    where product_id = v_item.product_id
      and store_id = p_store_id
      and stock_quantity >= v_item.quantity;

    if not found then
      raise exception 'race: stock changed during checkout';
    end if;
  end loop;

  update public.baskets
  set status = 'completed', updated_at = now()
  where id = p_basket_id;

  perform public.enqueue_outbox(
    'checkout.completed',
    jsonb_build_object(
      'basket_id', p_basket_id,
      'store_id', p_store_id,
      'user_id', v_basket.user_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'code', 'ORDER_PLACED',
    'basket_id', p_basket_id,
    'status', 'completed'
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 8. RPC: find alternatives (same category, in-stock, nearest price)
-- ------------------------------------------------------------------------------
create or replace function public.find_alternatives(
  p_product_id uuid,
  p_store_id uuid default null,
  p_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_result jsonb;
begin
  select * into v_product from public.products where id = p_product_id;
  if not found then
    raise exception 'product not found';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_result
  from (
    select
      p.id as product_id,
      p.name,
      p.description,
      p.category,
      p.price,
      p.image_url,
      i.store_id,
      s.name as store_name,
      s.city,
      i.stock_quantity,
      abs(p.price - v_product.price) as price_delta
    from public.products p
    join public.inventory i on i.product_id = p.id
    join public.stores s on s.id = i.store_id
    where p.category = v_product.category
      and p.id <> v_product.id
      and i.stock_quantity > 0
    order by
      case when p_store_id is not null and i.store_id = p_store_id then 0 else 1 end,
      abs(p.price - v_product.price),
      i.stock_quantity desc
    limit greatest(1, least(coalesce(p_limit, 5), 20))
  ) t;

  return jsonb_build_object(
    'product_id', p_product_id,
    'category', v_product.category,
    'alternatives', v_result
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- 9. RPC: claim + mark outbox batch (worker / edge function)
-- ------------------------------------------------------------------------------
create or replace function public.claim_outbox(p_limit integer default 20)
returns setof public.outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with cte as (
    select id
    from public.outbox
    where status = 'pending'
    order by created_at
    limit greatest(1, least(coalesce(p_limit, 20), 100))
    for update skip locked
  )
  update public.outbox o
  set status = 'processing', attempts = o.attempts + 1
  from cte
  where o.id = cte.id
  returning o.*;
end;
$$;

create or replace function public.complete_outbox(
  p_id uuid,
  p_ok boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_ok then
    update public.outbox
    set status = 'published', published_at = now(), last_error = null
    where id = p_id;
  else
    update public.outbox
    set status = case when attempts >= 5 then 'failed' else 'pending' end,
        last_error = left(coalesce(p_error, 'unknown'), 500)
    where id = p_id;
  end if;
end;
$$;

-- ------------------------------------------------------------------------------
-- 10. RLS for pipeline tables
-- ------------------------------------------------------------------------------
alter table public.inventory_events enable row level security;
alter table public.outbox enable row level security;
alter table public.restock_requests enable row level security;

-- Authenticated users can read inventory telemetry (merchant dashboard)
drop policy if exists inventory_events_select_auth on public.inventory_events;
create policy inventory_events_select_auth on public.inventory_events
  for select to authenticated using (true);

drop policy if exists restock_select_auth on public.restock_requests;
create policy restock_select_auth on public.restock_requests
  for select to authenticated using (true);

drop policy if exists restock_update_auth on public.restock_requests;
create policy restock_update_auth on public.restock_requests
  for update to authenticated using (true);

-- Outbox is service-role only (no anon/authenticated policies)

-- Grant execute on RPCs
grant execute on function public.adjust_inventory(uuid, uuid, integer, text, uuid) to authenticated, service_role;
grant execute on function public.checkout_basket(uuid, uuid) to authenticated, service_role;
grant execute on function public.find_alternatives(uuid, uuid, integer) to anon, authenticated, service_role;
grant execute on function public.rescue_basket_item(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.enqueue_outbox(text, jsonb) to service_role;
grant execute on function public.claim_outbox(integer) to service_role;
grant execute on function public.complete_outbox(uuid, boolean, text) to service_role;
