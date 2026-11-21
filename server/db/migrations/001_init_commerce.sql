-- Celerity Commerce — Aiven PostgreSQL schema (no auth.users FK)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  preferred_city text CHECK (preferred_city IS NULL OR preferred_city IN ('Bengaluru', 'Mumbai', 'Delhi')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL UNIQUE CHECK (city IN ('Bengaluru', 'Mumbai', 'Delhi')),
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  offer_price numeric(12,2) CHECK (offer_price IS NULL OR offer_price >= 0),
  image_url text NOT NULL DEFAULT '',
  warranty text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reorder_threshold integer NOT NULL DEFAULT 5 CHECK (reorder_threshold >= 0),
  last_sold_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_inventory_product_store UNIQUE (product_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory(stock);

CREATE TABLE IF NOT EXISTS carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city text NOT NULL CHECK (city IN ('Bengaluru', 'Mumbai', 'Delhi')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_carts_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  CONSTRAINT uq_cart_item UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  city text NOT NULL CHECK (city IN ('Bengaluru', 'Mumbai', 'Delhi')),
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal numeric(12,2) NOT NULL,
  shipping numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  sku text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  whatsapp_e164 text,
  lead_time_days integer NOT NULL DEFAULT 7 CHECK (lead_time_days >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_suppliers (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (product_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS inventory_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  change_type text NOT NULL,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_audit ON inventory_audit_logs(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS restock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  current_stock integer NOT NULL,
  reorder_threshold integer NOT NULL,
  suggested_qty integer NOT NULL CHECK (suggested_qty > 0),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'contacted', 'ordered', 'received', 'closed')),
  whatsapp_status text NOT NULL DEFAULT 'pending'
    CHECK (whatsapp_status IN ('pending_configuration', 'pending', 'submitted', 'failed', 'delivered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_restock_open
  ON restock_requests(product_id, store_id)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS supplier_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restock_request_id uuid REFERENCES restock_requests(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  status text NOT NULL,
  provider_message_id text,
  provider_response jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_id uuid,
  city text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'published', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(status, created_at) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_event_id ON outbox(event_id);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id uuid NOT NULL,
  consumer_group text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, consumer_group)
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('csv', 'excel', 'manual')),
  filename text,
  valid_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  message text NOT NULL
);

INSERT INTO stores (name, city, address) VALUES
  ('Bengaluru Hub', 'Bengaluru', 'MG Road, Bengaluru'),
  ('Mumbai Hub', 'Mumbai', 'Bandra Kurla Complex, Mumbai'),
  ('Delhi Hub', 'Delhi', 'Connaught Place, New Delhi')
ON CONFLICT (city) DO NOTHING;

INSERT INTO categories (name, slug) VALUES
  ('Laptops', 'laptops'),
  ('Smartphones', 'smartphones'),
  ('Tablets', 'tablets'),
  ('Televisions', 'televisions'),
  ('Headphones and audio', 'headphones-audio'),
  ('Cameras', 'cameras'),
  ('Smartwatches', 'smartwatches'),
  ('Computer accessories', 'computer-accessories'),
  ('Gaming electronics', 'gaming-electronics'),
  ('Other electronics', 'other-electronics')
ON CONFLICT (name) DO NOTHING;
