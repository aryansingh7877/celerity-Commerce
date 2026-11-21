-- ==============================================================================
-- CELERITY COMMERCE — SUPABASE DATABASE SCHEMA MIGRATION
-- Phase 2: Profiles, Catalog, Inventory, Smart Baskets & Rescue Events
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to automatically create profile when new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    now(),
    now()
  )
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      email = coalesce(excluded.email, public.profiles.email),
      updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. PRODUCTS
-- ------------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_price on public.products(price);

-- ------------------------------------------------------------------------------
-- 3. STORES (Multi-City Fulfillment Hubs)
-- ------------------------------------------------------------------------------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_stores_city on public.stores(city);

-- ------------------------------------------------------------------------------
-- 4. INVENTORY (Real-time stock per hub)
-- ------------------------------------------------------------------------------
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  updated_at timestamptz not null default now(),
  constraint uq_product_store unique (product_id, store_id)
);

create index if not exists idx_inventory_lookup on public.inventory(product_id, store_id);

-- ------------------------------------------------------------------------------
-- 5. BASKETS
-- ------------------------------------------------------------------------------
create table if not exists public.baskets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'rescued', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_baskets_user on public.baskets(user_id);

-- ------------------------------------------------------------------------------
-- 6. BASKET ITEMS
-- ------------------------------------------------------------------------------
create table if not exists public.basket_items (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid not null references public.baskets(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  constraint uq_basket_product unique (basket_id, product_id)
);

create index if not exists idx_basket_items_basket on public.basket_items(basket_id);

-- ------------------------------------------------------------------------------
-- 7. RESCUE EVENTS (Cart preservation history)
-- ------------------------------------------------------------------------------
create table if not exists public.rescue_events (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid not null references public.baskets(id) on delete cascade,
  unavailable_product_id uuid not null references public.products(id),
  replacement_product_id uuid not null references public.products(id),
  status text not null default 'completed' check (status in ('suggested', 'accepted', 'rejected', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_rescue_events_basket on public.rescue_events(basket_id);

-- ------------------------------------------------------------------------------
-- ATOMIC STORED PROCEDURE: Smart Basket Item Rescue
-- ------------------------------------------------------------------------------
create or replace function public.rescue_basket_item(
  p_basket_id uuid,
  p_unavailable_product_id uuid,
  p_replacement_product_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_replacement_price numeric(10,2);
  v_event_id uuid;
begin
  -- Get replacement product price
  select price into v_replacement_price 
  from public.products 
  where id = p_replacement_product_id;

  if v_replacement_price is null then
    raise exception 'Replacement product not found';
  end if;

  -- Delete or swap item in basket_items
  delete from public.basket_items 
  where basket_id = p_basket_id and product_id = p_unavailable_product_id;

  insert into public.basket_items (basket_id, product_id, quantity, price)
  values (p_basket_id, p_replacement_product_id, 1, v_replacement_price)
  on conflict (basket_id, product_id) do update
  set quantity = public.basket_items.quantity + 1;

  -- Update basket status to rescued
  update public.baskets 
  set status = 'rescued', updated_at = now() 
  where id = p_basket_id;

  -- Insert rescue audit log
  insert into public.rescue_events (basket_id, unavailable_product_id, replacement_product_id, status)
  values (p_basket_id, p_unavailable_product_id, p_replacement_product_id, 'completed')
  returning id into v_event_id;

  return jsonb_build_object(
    'success', true,
    'rescue_event_id', v_event_id,
    'status', 'rescued'
  );
end;
$$;

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stores enable row level security;
alter table public.inventory enable row level security;
alter table public.baskets enable row level security;
alter table public.basket_items enable row level security;
alter table public.rescue_events enable row level security;

-- Profiles: Users can read and update their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Products: Public catalog read access
create policy "products_select_public" on public.products
  for select using (true);

-- Stores: Public fulfillment hub read access
create policy "stores_select_public" on public.stores
  for select using (true);

-- Inventory: Public stock availability read access (writes restricted to server)
create policy "inventory_select_public" on public.inventory
  for select using (true);

-- Baskets: Users can only select/insert/update their own baskets
create policy "baskets_select_own" on public.baskets
  for select using (auth.uid() = user_id);

create policy "baskets_insert_own" on public.baskets
  for insert with check (auth.uid() = user_id);

create policy "baskets_update_own" on public.baskets
  for update using (auth.uid() = user_id);

-- Basket Items: Users can only access items inside their own baskets
create policy "basket_items_select_own" on public.basket_items
  for select using (
    exists (
      select 1 from public.baskets 
      where baskets.id = basket_items.basket_id 
        and baskets.user_id = auth.uid()
    )
  );

create policy "basket_items_insert_own" on public.basket_items
  for insert with check (
    exists (
      select 1 from public.baskets 
      where baskets.id = basket_items.basket_id 
        and baskets.user_id = auth.uid()
    )
  );

create policy "basket_items_update_own" on public.basket_items
  for update using (
    exists (
      select 1 from public.baskets 
      where baskets.id = basket_items.basket_id 
        and baskets.user_id = auth.uid()
    )
  );

create policy "basket_items_delete_own" on public.basket_items
  for delete using (
    exists (
      select 1 from public.baskets 
      where baskets.id = basket_items.basket_id 
        and baskets.user_id = auth.uid()
    )
  );

-- Rescue Events: Users can access rescue records for their own baskets
create policy "rescue_events_select_own" on public.rescue_events
  for select using (
    exists (
      select 1 from public.baskets 
      where baskets.id = rescue_events.basket_id 
        and baskets.user_id = auth.uid()
    )
  );

create policy "rescue_events_insert_own" on public.rescue_events
  for insert with check (
    exists (
      select 1 from public.baskets 
      where baskets.id = rescue_events.basket_id 
        and baskets.user_id = auth.uid()
    )
  );
