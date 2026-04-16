# وصل (Wasal) - Yemeni Transport Super App

## Overview
A Tier-1 Super App experience for Yemen — HungerStation-quality delivery hub, city-to-city trips, parcel shipping, and taxi booking. Built with React/Vite on the frontend and Supabase as the hosted backend. Full Arabic RTL layout with professional photography and a modern Super App shell.

## Architecture
- **Frontend**: React 18 + TypeScript + Vite, running on port 5000
- **Backend/Database**: Supabase (hosted) — handles auth, database (PostgreSQL), storage, and realtime
- **UI**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router v6 with lazy-loaded pages
- **State**: TanStack React Query for server state

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
- **Auth**: Email/password + phone OTP + Google OAuth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: Multiple buckets for images, documents, receipts
- **Realtime**: Live updates for orders, messages, notifications
- **Edge Functions**: Deployed separately on Supabase for background tasks (auto-healing, invoice generation, reports, anomaly detection, push notifications)

## Key User Roles
- `customer` — Books trips, requests shipments/delivery/rides
- `supplier` — Manages trips and shipments (bus companies)
- `delivery_company` — Manages restaurants, delivery orders, riders
- `driver` — Handles taxi/ride requests
- `delivery_driver` — Handles food/parcel delivery orders
- `admin` — Full platform management

## Key Pages
- `/` — Public homepage / Super App shell
- `/login`, `/register` — Auth pages
- `/admin/*` — Admin dashboard (requires admin role)
- `/supplier/*` — Supplier portal
- `/delivery/*` — Delivery company portal
- `/driver/*` — Driver portal
- `/delivery-driver/*` — Delivery driver portal
- `/customer/*` — Customer portal

## Restaurant Coverage Logic (recently added)
- `restaurants.coverage_areas TEXT[]` — list of neighborhoods a restaurant covers. Empty = covers full city.
- Filter is city-level (restaurant.city = selectedCity), NOT neighborhood-level.
- Customer can enter their neighborhood in the UI (stored in localStorage as "wasal_customer_area").
- `getActiveRestaurants(city?, customerArea?)` in `restaurantApi.ts` handles the coverage enrichment:
  - `full` — restaurant has no coverage restriction (shows normally)
  - `covered` — customer's area is in restaurant's `coverage_areas` (shows normally)
  - `extra_fee` — area not in `coverage_areas` but delivery company has a zone → shows with extra fee badge
  - `out_of_range` — area not covered and no zone → card shown dimmed with warning
- Migration file: `supabase/migrations/20260411000000_add_coverage_areas.sql`
  - **Must be applied in Supabase SQL Editor**: `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS coverage_areas TEXT[] DEFAULT '{}';`

## Delivery Company Dashboard Features (recently added/fixed)
- **Notification Bell**: Real-time bell icon in the dashboard header. Queries `notifications` table for unread count; subscribes to realtime `INSERT` on notifications and new delivery_orders. Redirects to `/notifications` page.
- **Payment Proof in Orders**: Order details dialog now fetches the linked `payment_transactions` row (by `related_entity_id = order.id`) and shows: payment method, status badge, transfer amount, transfer reference/sender name, notes, timestamp, and the receipt image with a full-screen viewer.
- **Banner Management** (`/delivery/banners`): Delivery companies can add/edit/delete promotional banners that appear in the customer hub carousel. Migration: `supabase/migrations/20260412000000_add_delivery_banners.sql` must be applied in Supabase SQL Editor. Falls back to default banners until applied.
- **Restaurant City Fix**: Restaurant form now requires a `city` field. Pre-fills from company profile. Existing restaurants with `city = null` show a red warning card prompting the company to fix.

## UI Layout (latest changes — April 2026)
- **Header**: Simplified to search bar only (no logo, no location/city selector, no bell/cart icons)
- **Bottom Nav** (RTL right→left): السلة (cart /cart) | طلباتي (orders /history) | الرئيسية (home / — center raised) | الإشعارات (bell /notifications with badge) | المزيد (account/more)
- **Location chip removed**: "سيئون — الغرفة" chip no longer appears in the delivery hub page

## Customer Delivery Hub (latest revamp)
- **Hero Banner Carousel**: Auto-plays with nav arrows and dot indicators. Fetches carousel banners (`banner_type='carousel'`) from `delivery_banners` DB; falls back to 3 curated defaults.
- **Offers/Deals Section**: Horizontal scroll row showing offer tiles (`banner_type='offer'`) from `delivery_banners` DB. Falls back to 3 curated defaults. Managed from delivery company dashboard.
- **Service Category Tiles**: 2×2 grid with text labels at the BOTTOM. Navigations: مطاعم→restaurant tab, بقالة→grocery tab, صيدليات→pharmacy tab, المزيد→`/shipment-request` (delivery form).
- **Featured Horizontal Scroll**: Featured restaurants in a horizontal scroll carousel.
- **Highly Rated Section**: Separate horizontal scroll for restaurants with rating ≥ 4.5.
- **Cuisine Filter Pills**: 64×64 rounded tiles with images from `restaurant_cuisines` table.
- **Coverage/Area**: Area persisted in localStorage, shows coverage badges on cards. No location chip shown.
- **Banner Management** (delivery dashboard `/delivery/banners`): supports `banner_type` = `carousel` (sliding) or `offer` (deals tiles). Both types fully manageable (image, title, subtitle, badge, link, city).

## Pending DB Migrations (must be applied in Supabase SQL Editor)
1. `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS coverage_areas TEXT[] DEFAULT '{}';`
2. Full contents of `supabase/migrations/20260412000000_add_delivery_banners.sql` (delivery_banners table)
3. Full contents of `supabase/migrations/20260416000000_add_banner_type.sql` — adds:
   - `banner_type TEXT DEFAULT 'carousel'` (values: 'carousel' | 'offer' | 'service_tile')
   - `tile_action TEXT DEFAULT 'restaurants'` — where pressing a service tile navigates to
   - `tile_gradient TEXT DEFAULT 'from-orange-500 to-amber-500'` — color gradient for service tiles

## Notes
- Supabase Edge Functions handle background jobs (invoices, healing, metrics) — they run on Supabase infrastructure, not here
- All sensitive operations are protected by Supabase RLS policies
- The anon key is intentionally public (Supabase security model uses RLS, not key secrecy)
- PWA support enabled via vite-plugin-pwa (installable on mobile)
- Supabase project ID: xugjqhxfdjlndljogvru
