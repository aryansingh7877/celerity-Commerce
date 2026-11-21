# Celerity Commerce — Supabase Backend

Frontend stays on React + Vite and talks to Supabase Auth / PostgREST directly.  
This folder is the **backend pipeline**: schema, RPCs, outbox, and Edge Functions.

## Stack (matches repo)

| Piece | Tech |
|---|---|
| Auth + DB | Supabase (Postgres + Auth + RLS) |
| Atomic business logic | Postgres RPCs |
| Async pipeline | Transactional outbox + worker / Edge Function |
| HTTP API | Supabase Edge Functions (Deno) |

## Migrations

1. `20261121000000_create_celerity_schema.sql` — profiles, catalog, baskets, rescue RPC, RLS  
2. `20261121000001_seed_catalog_data.sql` — hubs, products, stock (includes OOS cold-brew rescue case)  
3. `20261121160000_backend_pipeline.sql` — inventory events, outbox, restock desk, checkout / adjust / alternatives RPCs, triggers

### Apply (Dashboard)

SQL Editor → run migrations **in order**.

### Apply (CLI)

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

## Pipeline flow

```
merchant adjust / checkout
        │
        ▼
 inventory UPDATE  ──trigger──► inventory_events
        │                            │
        │                            ▼
        │                         outbox (pending)
        │                            │
        ▼                            ▼
  restock_requests ←──stock < 3──  process-outbox
                                   (Edge Fn or npm run worker:outbox)
```

### RPCs

| RPC | Purpose |
|---|---|
| `adjust_inventory` | Merchant +/- stock (writes event + outbox) |
| `checkout_basket` | Atomic reserve; `409`-style payload with alternatives on conflict |
| `find_alternatives` | Same-category in-stock swaps |
| `rescue_basket_item` | Swap OOS line + audit (existing) |
| `claim_outbox` / `complete_outbox` | Worker batching |

### Edge Functions

| Function | Auth | Role |
|---|---|---|
| `checkout` | JWT | Calls `checkout_basket` |
| `adjust-inventory` | JWT | Calls `adjust_inventory` |
| `find-alternatives` | public | Calls `find_alternatives` |
| `process-outbox` | JWT / service | Drains outbox |

```bash
cp .env.example .env   # fill SUPABASE_* keys
npm run functions:serve
# or
npm run functions:deploy
npm run worker:outbox
npm run pipeline:smoke
```

## Env

See `.env.example`. Never put `SUPABASE_SERVICE_ROLE_KEY` in the Vite client.
