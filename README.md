# celerity-Commerce

> **Celerity Commerce** — Multi-city electronics retail with Smart Basket Rescue, Aiven PostgreSQL / Kafka / OpenSearch, and Supabase Auth.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind
- **Auth:** Supabase Auth (JWT verified by Express)
- **API:** Node.js Express + TypeScript (`server/src`)
- **Data:** Aiven PostgreSQL (source of truth)
- **Events:** Transactional outbox → KafkaJS → Aiven Kafka → workers
- **Search:** Aiven OpenSearch (Postgres fuzzy fallback)
- **Notifications:** WhatsApp Business Cloud API (real provider responses only)
- **AI (optional):** Qwen via Ollama for admin dead-stock explanations only

## Setup

```bash
cp .env.example .env
# Fill Supabase Auth + Aiven PostgreSQL/Kafka/OpenSearch (+ WhatsApp/Ollama as needed)
npm install
npm run db:migrate
```

## Run (separate processes)

```bash
npm run api                 # Express API :4000
npm run worker:outbox       # outbox → Kafka
npm run worker:search       # Kafka → OpenSearch
npm run worker:inventory    # Kafka → restock + WhatsApp
npm run dev                 # Vite storefront/admin
```

Smoke:

```bash
npx tsx server/scripts/api-smoke.ts
```

Admin bootstrap: set `ADMIN_BOOTSTRAP_EMAILS=you@example.com` so the first `/api/auth/me` call elevates that Supabase user to `admin` in Aiven `profiles`.

## Notes

- Checkout uses conditional SQL stock updates; OpenSearch is never used for stock authority.
- Missing WhatsApp credentials yield `pending_configuration` — never a fake “sent”.
- Do not commit `.env`. See `.env.example` for all variables.
