-- ============================================================
-- وصال - Supabase Migration: Security Warnings Fixes
-- Run this in Supabase Dashboard → SQL Editor
-- Fixes: Function Search Path Mutable + Public Execute SECURITY
-- ============================================================

-- ─────────────────────────────────────────────
-- Fix 1: Function Search Path Mutable
-- Prevents search_path injection attacks by locking each
-- function to the public schema.
-- ─────────────────────────────────────────────

ALTER FUNCTION public.get_user_role(uuid)        SET search_path = public;
ALTER FUNCTION public.has_role(uuid, text)        SET search_path = public;
ALTER FUNCTION public.add_loyalty_points(uuid, integer, text) SET search_path = public;
ALTER FUNCTION public.redeem_loyalty_points(uuid, integer)    SET search_path = public;

-- Trigger functions (fired by auth hooks) - fix search_path
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT proname, oidvectortypes(proargtypes) AS argtypes
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN (
        'touch_rider', 'refresh_menu_items_avg_rating',
        'refresh_restaurant_avg_rating', 'validate_fare',
        'validate_menu_item', 'validate_region',
        'handle_new_user', 'validate_fa', 'validate_me', 'validate_re'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = public',
      fn.proname, fn.argtypes
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- Fix 2: Revoke anon from SECURITY DEFINER functions
-- Public (anon) should not be able to call privileged functions.
-- Authenticated users keep their access.
-- ─────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_loyalty_points(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer)    FROM anon;

GRANT  EXECUTE ON FUNCTION public.get_user_role(uuid)               TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, text)               TO authenticated;
GRANT  EXECUTE ON FUNCTION public.add_loyalty_points(uuid, integer, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer)    TO authenticated;

-- ─────────────────────────────────────────────
-- Fix 3: Storage buckets — disable public listing
-- Prevents anonymous enumeration of uploaded files.
-- Files are still readable if you know the path.
-- ─────────────────────────────────────────────

UPDATE storage.buckets
  SET public = false
  WHERE id IN (
    'company-logos', 'profile-logos', 'trip-images',
    'delivery-photos', 'payment-receipts'
  );

-- Re-create permissive SELECT policies so authenticated users
-- can still read objects they are allowed to see.
DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY[
    'company-logos','profile-logos','trip-images',
    'delivery-photos','payment-receipts'
  ]
  LOOP
    -- Drop any existing catch-all SELECT policy then re-add a tighter one
    BEGIN
      EXECUTE format(
        'DROP POLICY IF EXISTS "Public read %I" ON storage.objects', b
      );
    EXCEPTION WHEN others THEN NULL;
    END;

    EXECUTE format(
      $q$
        CREATE POLICY "Authenticated read %1$I"
          ON storage.objects FOR SELECT
          USING (bucket_id = %1$L AND auth.role() = 'authenticated')
      $q$, b
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- Fix 4: handle_new_user trigger — lock search_path
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'handle_new_user'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- NOTE: Enable "Leaked Password Protection" manually in:
-- Supabase Dashboard → Authentication → Security
-- (cannot be set via SQL)
-- ─────────────────────────────────────────────

-- Done ✓
