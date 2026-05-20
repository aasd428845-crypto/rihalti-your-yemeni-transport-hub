-- =============================================================
-- Wasal App — Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)
-- =============================================================

-- ─────────────────────────────────────────────
-- 1. restaurants
-- ─────────────────────────────────────────────
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS coverage_areas   text[]         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS commission_rate  numeric(5,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cover_image_url  text,
  ADD COLUMN IF NOT EXISTS price_per_km     double precision DEFAULT 0;

-- ─────────────────────────────────────────────
-- 2. delivery_orders
-- ─────────────────────────────────────────────
ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS delivery_driver_id  uuid,
  ADD COLUMN IF NOT EXISTS total_amount        numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address    text,
  ADD COLUMN IF NOT EXISTS pickup_lat          double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng          double precision;

-- ─────────────────────────────────────────────
-- 3. profiles
-- ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS customer_display_id text;

-- Auto-fill customer_display_id for existing rows that don't have one
UPDATE public.profiles
SET customer_display_id = 'عميل #' || (FLOOR(RANDOM() * 9000) + 1000)::TEXT
WHERE customer_display_id IS NULL;

-- ─────────────────────────────────────────────
-- 4. menu_items
-- ─────────────────────────────────────────────
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS cover_image text;

-- ─────────────────────────────────────────────
-- 5. rides
-- ─────────────────────────────────────────────
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS from_city       text,
  ADD COLUMN IF NOT EXISTS to_city         text,
  ADD COLUMN IF NOT EXISTS seats_available integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS departure_time  timestamp with time zone;

-- ─────────────────────────────────────────────
-- 6. drivers
-- ─────────────────────────────────────────────
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS status        text    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_available  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vehicle_type  text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS vehicle_plate text;

-- ─────────────────────────────────────────────
-- 7. delivery_drivers
-- ─────────────────────────────────────────────
ALTER TABLE public.delivery_drivers
  ADD COLUMN IF NOT EXISTS is_available  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status        text    DEFAULT 'active';

-- ─────────────────────────────────────────────
-- 8. Reload PostgREST schema cache
--    (fixes "column X not found in schema cache" errors)
-- ─────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
