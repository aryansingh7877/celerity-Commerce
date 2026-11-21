-- ==============================================================================
-- CELERITY COMMERCE — SEED CATALOG DATA MIGRATION
-- Multi-city stores, catalog products & live inventory records
-- ==============================================================================

-- 1. Insert Fulfillment Hubs
insert into public.stores (id, name, city, address) values
  ('d1000000-0000-0000-0000-000000000001', 'Midtown Logistics Hub', 'New York', '450 Lexington Ave, New York, NY'),
  ('d1000000-0000-0000-0000-000000000002', 'Downtown Fast Fulfillment', 'New York', '180 Broadway, New York, NY'),
  ('d1000000-0000-0000-0000-000000000003', 'Brooklyn Terminal Hub', 'New York', '250 Atlantic Ave, Brooklyn, NY'),
  ('d1000000-0000-0000-0000-000000000004', 'SoMa Automated Hub', 'San Francisco', '500 Howard St, San Francisco, CA'),
  ('d1000000-0000-0000-0000-000000000005', 'Central London Depo', 'London', '100 Shoreditch High St, London, UK')
on conflict (id) do nothing;

-- 2. Insert Products
insert into public.products (id, name, description, category, price, image_url) values
  (
    'a1000000-0000-0000-0000-000000000001',
    'Resurrection Aromatique Hand Balm 75ml',
    'Rich moisturizing botanicals with Mandarin Rind and Rosemary Leaf.',
    'Personal Care',
    35.00,
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Yirgacheffe Single-Origin Cold Brew 750ml',
    'High-altitude Ethiopian slow extraction with bright bergamot and jasmine notes.',
    'Specialty Beverage',
    18.50,
    'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80'
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'Cast Iron Pour-Over Ceramic Dripper',
    'Precision thermal cone dripper crafted from matte stoneware.',
    'Kitchenware',
    44.00,
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'Guji Highland Washed Cold Extraction 750ml',
    'Intelligent alternative: identical citrus notes, local hub inventory ready.',
    'Specialty Beverage',
    19.00,
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80'
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'Kyoto Slow Drip Micro-Lot Reserve 700ml',
    'Matched price tier, artisanal cold water drip extraction.',
    'Specialty Beverage',
    18.00,
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80'
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    'Organic Cascara Nitro Sparkling Elixir 500ml',
    'Refreshing antioxidant sparkling elixir from sun-dried coffee fruit.',
    'Specialty Beverage',
    16.50,
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
  ),
  (
    'a1000000-0000-0000-0000-000000000007',
    'Botanical Body Cleanser No. 4',
    'Gentle daily body cleanser with Geranium Leaf and Bergamot.',
    'Skincare',
    38.00,
    'https://images.unsplash.com/photo-1608248597359-bb436d4a52fc?auto=format&fit=crop&w=600&q=80'
  ),
  (
    'a1000000-0000-0000-0000-000000000008',
    'Tactile Ceramic Teapot & Cup Set',
    'Hand-thrown clay set with unglazed exterior and food-safe celadon interior.',
    'Living',
    88.00,
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80'
  )
on conflict (id) do nothing;

-- 3. Insert Inventory Levels (Demonstrating stock depletion and alternative availability)
insert into public.inventory (product_id, store_id, stock_quantity) values
  -- Hand Balm: 6 units at Midtown, 10 units at Downtown
  ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 6),
  ('a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 10),

  -- Yirgacheffe Cold Brew: 0 units at Midtown (TRIGGER FOR SMART BASKET RESCUE)
  ('a1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 0),

  -- Dripper: 12 units at Midtown
  ('a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 12),

  -- Guji Washed (Top Alternative): 14 units at Downtown Hub (12 mins away)
  ('a1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', 14),

  -- Kyoto Slow Drip: 8 units at Midtown Hub
  ('a1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 8),

  -- Cascara Nitro: 22 units at Brooklyn Terminal Hub
  ('a1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000003', 22),

  -- Skincare & Living: In stock in San Francisco
  ('a1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000004', 24),
  ('a1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000004', 3)
on conflict (product_id, store_id) do update
set stock_quantity = excluded.stock_quantity, updated_at = now();
