-- Migration 006: Add geofencing support to delivery_zones
-- Run this in Supabase SQL Editor (safe — no data deleted)

-- 1. Add geo columns to delivery_zones
ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS center_lat  numeric,
  ADD COLUMN IF NOT EXISTS center_lng  numeric,
  ADD COLUMN IF NOT EXISTS radius_km   numeric DEFAULT 5;

-- 2. Ensure RLS is enabled and unauthenticated users can read active zones
--    (needed so the coverage gate works before login)
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zones_public_read"          ON public.delivery_zones;
DROP POLICY IF EXISTS "company_manages_own_zones"  ON public.delivery_zones;

CREATE POLICY "zones_public_read"
  ON public.delivery_zones FOR SELECT
  USING (true);

CREATE POLICY "company_manages_own_zones"
  ON public.delivery_zones FOR ALL
  USING  (delivery_company_id = auth.uid())
  WITH CHECK (delivery_company_id = auth.uid());

GRANT SELECT                            ON public.delivery_zones TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.delivery_zones TO authenticated;

NOTIFY pgrst, 'reload schema';
