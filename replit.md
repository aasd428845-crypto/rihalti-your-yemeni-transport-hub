# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

---

## Artifacts

### وصال - منصة النقل الذكية (Web)
- **Path**: `artifacts/wasal`
- **Stack**: React + Vite + Supabase
- **Preview**: `/`

### وصال - تطبيق Android (Mobile)
- **Path**: `artifacts/wasal-mobile`
- **Stack**: Expo Router + React Native + Supabase
- **Supabase**: `https://hhqhoqwpebnmfuhwhllw.supabase.co`
- **Brand**: Primary `#0c7d4a`, Accent `#f59e0b`, BG `#f7f5f0`, FG `#1b2d45`
- **Font**: Cairo (Arabic)

#### Mobile App Screens

**Root**
- `app/index.tsx` — Role-based redirect (admin/delivery_company/rider/customer)
- `app/_layout.tsx` — Root layout with AuthProvider, QueryClient, Cairo font
- `app/auth/login.tsx` — Login screen with Supabase auth + role routing

**Customer Role** (`app/(customer)/`)
- `_layout.tsx` — Tabs: الرئيسية / طلباتي / الإشعارات / حسابي + hidden screens
- `index.tsx` — Home hub: service tiles, banner carousel, offers, categories, items
- `orders.tsx` — Tabbed order history: shipments / deliveries / bookings / rides (cancel modal)
- `notifications.tsx` — Notification list with mark-read
- `profile.tsx` — Profile screen (tab) with edit + quick links
- `account.tsx` — Account settings (hidden, full edit + password reset)
- `more.tsx` — More menu: profile card, WhatsApp support, menu sections, sign out
- `restaurants.tsx` — Restaurant listing with search + cuisine filter
- `addresses.tsx` — Saved addresses: add / delete / set default

**Rider Role** (`app/(rider)/`)
- `index.tsx` — Active orders, online toggle, earnings
- `collections.tsx` — Cash collections summary + list
- `profile.tsx` — Rider profile + logout

**Delivery Company Role** (`app/(delivery-company)/`)
- `index.tsx` — Dashboard: stats, recent orders
- `orders.tsx` — Order management with status transitions
- `riders.tsx` — Rider list with online status
- `finance.tsx` — Invoices and financial summary

**Admin Role** (`app/(admin)/`)
- `index.tsx` — KPI dashboard: users, revenue, alerts
- `users.tsx` — User list with search by name/phone/city
- `settings.tsx` — Platform settings + commission rates

#### Auth Context
- `contexts/AuthContext.tsx` — session, user, role, profile, loading, signOut, refreshProfile
- Role values: `customer | admin | delivery_company | delivery_driver | driver`

#### Supabase Tables Used
- `user_roles`, `profiles`, `delivery_banners`, `menu_items`, `restaurants`
- `restaurant_cuisines`, `notifications`, `shipment_requests`, `delivery_orders`
- `bookings`, `trips`, `ride_requests`, `cancellation_requests`
- `riders`, `rider_cash_collections`, `partner_invoices`, `financial_transactions`
- `admin_settings`, `accounting_settings`, `partner_join_requests`, `addresses`

### API Server
- **Path**: `artifacts/api-server`
- **Stack**: Express 5 + Drizzle ORM
- **Preview**: `/api`
