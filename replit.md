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
npm run dev   # Starts Vite dev server on port 5000
npm run build # Build for production
```

## Environment Variables
The following env vars are required (set in Replit Secrets/Env Vars):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key (safe to expose in browser)
- `VITE_SUPABASE_PROJECT_ID` — Supabase project ID
- `VITE_ONESIGNAL_APP_ID` — (Optional) OneSignal push notifications app ID

## Supabase Features Used
- **Auth**: Email/password + phone OTP + Google OAuth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Storage**: Multiple buckets for images, documents, receipts
- **Realtime**: Live updates for orders, messages, notifications
- **Edge Functions**: Deployed separately on Supabase for background tasks

## Key User Roles
- `customer` — Books trips, requests shipments/delivery/rides
- `supplier` — Manages trips and shipments (bus companies)
- `delivery_company` — Manages restaurants, delivery orders, riders
- `driver` — Handles taxi/ride requests
- `delivery_driver` — Handles food/parcel delivery orders
- `admin` — Full platform management

## Key Pages
- `/` — Public homepage with trip search
- `/login`, `/register` — Auth pages
- `/admin/*` — Admin dashboard (requires admin role)
- `/supplier/*` — Supplier portal
- `/delivery/*` — Delivery company portal
- `/driver/*` — Driver portal
- `/delivery-driver/*` — Delivery driver portal
- `/customer/*` — Customer portal

## Notes
- Supabase Edge Functions handle background jobs (invoices, healing, metrics) — they run on Supabase infrastructure, not here
- All sensitive operations are protected by Supabase RLS policies
- The anon key is intentionally public (Supabase security model uses RLS, not key secrecy)
