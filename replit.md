# وصل (Wasal) - Yemeni Transport Super App

## Overview
A Tier-1 Super App experience for Yemen — HungerStation-quality delivery hub, city-to-city trips, parcel shipping, and taxi booking. Built with React/Vite on the frontend and Supabase as the hosted backend. Full Arabic RTL layout with professional photography and a modern Super App shell.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite, running on port 5000
- **Backend/Database**: Supabase (hosted) — handles auth, database (PostgreSQL), storage, and realtime
- **UI**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router v6 with lazy-loaded pages
- **State**: TanStack React Query for server state
- **PWA**: Progressive Web App via vite-plugin-pwa

## Running the Project
```bash
npm install   # Install dependencies
npm run dev   # Starts Vite dev server on port 5000
npm run build # Build for production
```

## Environment Variables
The following env vars are set in Replit (shared environment):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key (safe to expose in browser)
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID
- `VITE_ONESIGNAL_APP_ID` — (Optional) OneSignal push notifications app ID

## Supabase Features Used
- **Auth**: Email/password + phone OTP + Google OAuth (via supabase.auth.signInWithOAuth)
- **Database**: PostgreSQL with Row Level Security (RLS), 40+ migrations
- **Storage**: Multiple buckets for images, documents, receipts
- **Realtime**: Live updates for orders, messages, driver locations
- **Edge Functions**: Auto-healing, invoice generation, notifications, metrics

## User Roles
- `customer` — Books trips, orders delivery/food, requests rides
- `supplier` — Transport company managing trips and shipments
- `delivery_company` — Food/parcel delivery company managing restaurants and riders
- `driver` — Taxi driver accepting ride requests
- `delivery_driver` — Delivery rider fulfilling food orders
- `admin` — Full platform management

## Key Pages & Routes
- `/` — Landing page (Super App shell)
- `/login`, `/register` — Auth pages
- `/trips` — City-to-city bus trips
- `/delivery-hub` — Food & delivery hub
- `/supplier/*` — Supplier dashboard
- `/delivery/*` — Delivery company dashboard
- `/driver/*` — Driver app
- `/delivery-driver/*` — Delivery rider app
- `/admin/*` — Admin panel

## Replit Migration Notes
- Migrated from Lovable to Replit
- Replaced `@lovable.dev/cloud-auth-js` with Supabase native OAuth
- Supabase remains the backend (deep integration — not replaced with Neon/Drizzle)
- All env vars configured via Replit shared environment

## Delivery Pricing Center (Apr 2026)
- New page `/delivery/pricing` (`src/pages/delivery/DeliveryPricing.tsx`) added to the delivery company dashboard with three tabs:
  1. **طلبات التسعير** — Inbox of customer delivery requests where the location wasn't pinned. Company sets a price → updates `delivery_orders` (status="priced", total/delivery_fee) and notifies the customer.
  2. **تسعير طلبات التوصيل** — Company-wide per-km + minimum-fee for delivery requests (writes `partner_settings.price_per_km`/`min_delivery_fee`).
  3. **تسعير المطاعم** — Inline per-restaurant `price_per_km` editor (writes `restaurants.price_per_km`).
- Sidebar menu item "مركز التسعير" (Calculator icon) at `/delivery/pricing`.

## Promotion Scheduling System (May 2026)
- **Menu item promos**: Added `promo_starts_at`, `promo_ends_at`, `promo_active_days`, `promo_start_time`, `promo_end_time` columns to `menu_items` via SQL migration `20260501100000_menu_item_promo_scheduling.sql` (must be run in Supabase SQL Editor).
- **Admin UI (`DeliveryMenuManagement.tsx`)**: Promo dialog now has a "جدولة العرض" section — date range pickers, day-of-week toggles, and daily time window. Scheduling is optional; omit to make promo always active.
- **Customer UI (`RestaurantMenuPage.tsx`)**: Item cards use `isPromoScheduleActive()` to check if schedule is currently valid. Shows a real-time countdown badge (refreshes every minute) when `promo_ends_at` is set. Custom promo labels and discount badges only show when schedule is active.
- **Notifications**: Activating any menu item promo (new or toggle-on) fires `send-push-notification` Edge Function to all customers via OneSignal. Same applies to restaurant-level promotions (`DeliveryPromotions.tsx`) on save and on toggle-active.
- **Helpers in `promotionsApi.ts`**: `isPromoScheduleActive()`, `getPromoCountdown()`, `notifyCustomersAboutPromo()`.

## DeliveryRequestPage Step 4 — Payment Flow
- Loads each delivery company's `cash_on_delivery_enabled` and `partner_bank_accounts` when a company is selected.
- Cash option hidden if the company disables cash; bank-transfer view shows the company's actual bank accounts inline.
- When customer hasn't pinned both locations, the order is sent as `awaiting_pricing=true` with `delivery_fee=0`, `payment_method=null`. Company gets a notification routed to `/delivery/pricing`.
- After pricing, the customer gets an in-app + toast notification; clicking opens `/order/track/delivery/:id` where a payment-selection card appears (cash + bank transfer based on company settings) and shows the company's bank accounts after bank-transfer is chosen.
- Choosing payment writes `payment_method` + `status="confirmed"` and notifies the company.
