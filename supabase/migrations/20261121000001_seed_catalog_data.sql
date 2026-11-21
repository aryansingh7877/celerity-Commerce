-- ==============================================================================
-- CELERITY COMMERCE — SEED STORES ONLY
-- Demo catalog products removed; shop stays empty until admin uploads SKUs.
-- ==============================================================================

-- Fulfillment hubs (kept for city routing / inventory)
insert into public.stores (id, name, city, address) values
  ('d1000000-0000-0000-0000-000000000001', 'Midtown Logistics Hub', 'New York', '450 Lexington Ave, New York, NY'),
  ('d1000000-0000-0000-0000-000000000002', 'Downtown Fast Fulfillment', 'New York', '180 Broadway, New York, NY'),
  ('d1000000-0000-0000-0000-000000000003', 'Brooklyn Terminal Hub', 'New York', '250 Atlantic Ave, Brooklyn, NY'),
  ('d1000000-0000-0000-0000-000000000004', 'SoMa Automated Hub', 'San Francisco', '500 Howard St, San Francisco, CA'),
  ('d1000000-0000-0000-0000-000000000005', 'Central London Depo', 'London', '100 Shoreditch High St, London, UK')
on conflict (id) do nothing;
