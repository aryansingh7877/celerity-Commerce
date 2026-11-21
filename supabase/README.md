# Celerity Commerce — Supabase Database Setup & Migrations

This folder contains the complete, production-ready PostgreSQL migrations for Celerity Commerce's Smart Basket Rescue platform.

## Migration Files

1. **`supabase/migrations/20261121000000_create_celerity_schema.sql`**
   - Tables: `profiles`, `products`, `stores`, `inventory`, `baskets`, `basket_items`, `rescue_events`.
   - Security: Complete Row Level Security (RLS) policies for user data isolation.
   - Automation: `on_auth_user_created` trigger to automatically create customer profile rows upon signup.
   - Stored Procedure: `rescue_basket_item` for atomic inventory swapping and audit logging.

2. **`supabase/migrations/20261121000001_seed_catalog_data.sql`**
   - Multi-city hubs (New York Midtown, Downtown, Brooklyn, San Francisco, London).
   - Sample artisanal products with high-resolution imagery.
   - Initial inventory levels demonstrating the exact checkout problem (Yirgacheffe Cold Brew stock depleted to 0 at Midtown Hub, with 14 units of Guji Washed alternative ready at Downtown Hub).

## Applying Migrations to Supabase

### Option A: Using the Supabase Dashboard (Recommended)
1. Open your Supabase Dashboard: [https://supabase.com/dashboard/project/tmppdjjxjwakjnncxknm](https://supabase.com/dashboard/project/tmppdjjxjwakjnncxknm)
2. In the left sidebar, navigate to the **SQL Editor**.
3. Create a new query, paste the contents of `20261121000000_create_celerity_schema.sql`, and click **Run**.
4. Create a second query, paste the contents of `20261121000001_seed_catalog_data.sql`, and click **Run**.

### Option B: Using the Supabase CLI
```bash
supabase db push
```

## Environment Variables Configured
The client is automatically connected via `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tmppdjjxjwakjnncxknm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3RPIXNt53IqsuKK8_a5ezA_q1khqiuA
VITE_SUPABASE_URL=https://tmppdjjxjwakjnncxknm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_3RPIXNt53IqsuKK8_a5ezA_q1khqiuA
```
