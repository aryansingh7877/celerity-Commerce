# celerity-Commerce

> **Celerity Commerce** — Smart Basket Rescue Platform & Merchant Inventory Management. Never lose a sale to an empty shelf.

---

## 🌟 Overview

Celerity Commerce transforms the e-commerce fulfillment experience with:
- **Smart Basket Rescue**: Real-time out-of-stock detection with 1-tap equivalent item swaps.
- **Merchant Inventory Dashboard**: Production-grade admin management system for real-time inventory telemetry, multi-hub stock management (Bangalore, Mumbai, Delhi), catalog categorization, and replenishment alerts.
- **Premium Split-Screen Authentication**: Originkit Canvas Stipple Flow animation, Zenvo-inspired frosted glassmorphism, and instant session management.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom Aurora & Glassmorphism Design Tokens
- **Animations**: Framer Motion + GSAP
- **Icons**: Lucide React
- **Backend / Auth**: Supabase (Postgres, Auth, RLS, Edge Functions, transactional outbox)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/aryansingh7877/celerity-Commerce.git
cd celerity-Commerce
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment (same `.env` for every clone)
`.env` is gitignored — never commit it. Teammates need the **same** values:

```bash
cp .env.example .env
# then paste the shared team keys (Supabase, Aiven, Resend, etc.)
```

Email 2FA sends a code to **any** address typed at challenge time.  
If Resend is still on `onboarding@resend.dev` (test mode), inbox delivery may only work for the Resend owner — the API then prints the 6-digit code in the terminal (`EMAIL_2FA_CONSOLE_FALLBACK`, default on) so every clone with that `.env` can unlock. For real delivery to every inbox, verify a Resend domain (or set SMTP) and update `EMAIL_FROM`.

### 4. Run (API + app)
One frontend, one login. Role chooses the portal after auth (+ MFA if enabled).

```bash
npm run api              # API :4000
npm run dev              # App :3001
```

- http://127.0.0.1:3001 — shared login/signup
- After auth: `customer` → storefront, `admin` → merchant dashboard
- Merchant admins: set `ADMIN_BOOTSTRAP_EMAILS`
- `/api/admin/*` requires admin JWT (**403** for customers, **401** if unsigned)

### 5. Backend pipeline (Supabase)
```bash
# Apply SQL migrations in supabase/migrations/ (Dashboard SQL Editor or `npm run db:push`)
npm run functions:serve    # Edge Functions locally
npm run worker:outbox      # drains outbox (optional)
npm run pipeline:smoke     # RPC smoke check
```

Details: [`supabase/README.md`](supabase/README.md)

### 6. Build for Production
```bash
npm run build   # outputs dist/
```

---

## 📊 Features

- **One app**: shared login; role-based storefront vs merchant admin (no portal switcher)
- **Merchant Admin Portal**:
  - Live Overview with 4 KPI cards (Total Products, Total Stock, Low Stock, Out of Stock)
  - Category Volume & Valuation Analytics
  - Full SKU inventory management with instant `+` and `-` stock adjustments
  - Add, Edit, and Delete product workflows with modal dialogs
  - Shopcart-inspired visual product grid
  - Multi-city Hub logistics telemetry (Bangalore, Mumbai, Delhi)
  - Suppliers directory with embedded supplier notification logs

---

## 📄 License

MIT © 2026 Celerity Commerce Inc.
