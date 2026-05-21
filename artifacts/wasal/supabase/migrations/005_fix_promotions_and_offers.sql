-- ============================================================
-- وصال – Migration 005: Fix promotions + delivery offers + bucket
-- Run once in: Supabase Dashboard → SQL Editor
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1.  restaurant_promotions — add every column the app expects
--     (safe: IF NOT EXISTS, so re-running is harmless)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.restaurant_promotions
  ADD COLUMN IF NOT EXISTS promo_type       text,
  ADD COLUMN IF NOT EXISTS promo_text       text,
  ADD COLUMN IF NOT EXISTS image_url        text,
  ADD COLUMN IF NOT EXISTS badge_text       text,
  ADD COLUMN IF NOT EXISTS min_order_amount numeric,
  ADD COLUMN IF NOT EXISTS discount_percent numeric,
  ADD COLUMN IF NOT EXISTS discount_amount  numeric,
  ADD COLUMN IF NOT EXISTS buy_quantity     integer,
  ADD COLUMN IF NOT EXISTS get_quantity     integer,
  ADD COLUMN IF NOT EXISTS active_days      text[],
  ADD COLUMN IF NOT EXISTS start_time       time,
  ADD COLUMN IF NOT EXISTS end_time         time,
  ADD COLUMN IF NOT EXISTS starts_at        timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at          timestamptz;

-- Back-fill promo_type for any existing rows that have NULL
UPDATE public.restaurant_promotions
SET promo_type = 'custom_text'
WHERE promo_type IS NULL;

-- Refresh schema cache so PostgREST sees the new columns immediately
NOTIFY pgrst, 'reload schema';


-- ─────────────────────────────────────────────────────────────
-- 2.  restaurants — restore is_featured column if missing
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS restaurants_is_featured_idx
  ON public.restaurants (is_featured)
  WHERE is_featured = true;


-- ─────────────────────────────────────────────────────────────
-- 3.  delivery_company_offers  (عروض التوصيل)
--     Used by DeliveryOffers.tsx / deliveryOffersApi.ts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_company_offers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_company_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_type          text        NOT NULL
                        CHECK (offer_type IN ('free_delivery','percent_off_delivery','fixed_off_delivery')),
  title               text        NOT NULL,
  description         text,
  image_url           text,
  badge_text          text,
  discount_percent    numeric,
  discount_amount     numeric,
  min_order_amount    numeric,
  active_days         text[],
  start_time          time,
  end_time            time,
  starts_at           timestamptz,
  ends_at             timestamptz,
  is_active           boolean     NOT NULL DEFAULT true,
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_company_offers_company_idx
  ON public.delivery_company_offers (delivery_company_id);

CREATE INDEX IF NOT EXISTS delivery_company_offers_active_idx
  ON public.delivery_company_offers (is_active)
  WHERE is_active = true;

ALTER TABLE public.delivery_company_offers ENABLE ROW LEVEL SECURITY;

-- Public read (customers see the offers)
CREATE POLICY IF NOT EXISTS "anyone_can_read_delivery_company_offers"
  ON public.delivery_company_offers FOR SELECT USING (true);

-- Company manages own offers
CREATE POLICY IF NOT EXISTS "company_manages_own_delivery_offers"
  ON public.delivery_company_offers FOR ALL
  USING  (delivery_company_id = auth.uid())
  WITH CHECK (delivery_company_id = auth.uid());

-- Admins manage all
CREATE POLICY IF NOT EXISTS "admins_manage_all_delivery_offers"
  ON public.delivery_company_offers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

GRANT SELECT ON public.delivery_company_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_company_offers TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 4.  Storage bucket  "wasal-offers"
--     Used by ImageUpload in DeliveryPromotions + DeliveryOffers
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wasal-offers',
  'wasal-offers',
  true,
  5242880,   -- 5 MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old policies if they exist (safe re-run)
DROP POLICY IF EXISTS "wasal_offers_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "wasal_offers_auth_insert"    ON storage.objects;
DROP POLICY IF EXISTS "wasal_offers_auth_update"    ON storage.objects;
DROP POLICY IF EXISTS "wasal_offers_auth_delete"    ON storage.objects;

CREATE POLICY "wasal_offers_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wasal-offers');

CREATE POLICY "wasal_offers_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'wasal-offers' AND auth.role() = 'authenticated');

CREATE POLICY "wasal_offers_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'wasal-offers' AND auth.role() = 'authenticated');

CREATE POLICY "wasal_offers_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'wasal-offers' AND auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- Done ✓  — reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
