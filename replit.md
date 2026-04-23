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
