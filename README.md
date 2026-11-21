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

### 3. Run Development Server
```bash
npm run dev
```

### 4. Backend pipeline (Supabase)
```bash
cp .env.example .env
# Apply SQL migrations in supabase/migrations/ (Dashboard SQL Editor or `npm run db:push`)
npm run functions:serve    # Edge Functions locally
npm run worker:outbox      # drains outbox (optional)
npm run pipeline:smoke     # RPC smoke check
```

Details: [`supabase/README.md`](supabase/README.md)

### 5. Build for Production
```bash
npm run build
```

---

## 📊 Features

- **Merchant Admin Portal**:
  - Live Overview with 4 KPI cards (Total Products, Total Stock, Low Stock, Out of Stock)
  - Category Volume & Valuation Analytics
  - Full SKU inventory management with instant `+` and `-` stock adjustments
  - Add, Edit, and Delete product workflows with modal dialogs
  - Shopcart-inspired visual product grid
  - Multi-city Hub logistics telemetry (Bangalore, Mumbai, Delhi)
  - Seamless 1-click dual-mode switcher between Merchant Admin and Customer Storefront

---

## 📄 License

MIT © 2026 Celerity Commerce Inc.
