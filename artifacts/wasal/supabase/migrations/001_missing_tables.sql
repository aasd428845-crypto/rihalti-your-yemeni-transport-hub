-- ============================================================
-- وصال - Supabase Migration: Missing Tables
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. customer_favorites
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('restaurant', 'menu_item')),
  entity_id   uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, entity_type, entity_id)
);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_manage_own_favorites"
  ON public.customer_favorites
  FOR ALL
  USING  (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

GRANT SELECT, INSERT, DELETE
  ON public.customer_favorites TO anon, authenticated;

-- ─────────────────────────────────────────────
-- 2. menu_item_reviews
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_item_reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id)     ON DELETE CASCADE,
  customer_id  uuid NOT NULL REFERENCES public.profiles(id)       ON DELETE CASCADE,
  order_id     uuid             REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_item_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_item_reviews"
  ON public.menu_item_reviews FOR SELECT USING (true);

CREATE POLICY "customers_insert_own_item_reviews"
  ON public.menu_item_reviews FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

GRANT SELECT ON public.menu_item_reviews TO anon;
GRANT SELECT, INSERT ON public.menu_item_reviews TO authenticated;

-- ─────────────────────────────────────────────
-- 3. restaurant_promotions
--    Note: restaurants table uses delivery_company_id (no owner_id column)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restaurant_promotions (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id     uuid    NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  promo_type        text    NOT NULL,
  title             text    NOT NULL,
  description       text,
  promo_text        text,
  min_order_amount  numeric,
  discount_percent  numeric,
  discount_amount   numeric,
  buy_quantity      integer,
  get_quantity      integer,
  active_days       text[],
  start_time        time,
  end_time          time,
  starts_at         timestamptz,
  ends_at           timestamptz,
  is_active         boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restaurant_promotions_restaurant_id_idx
  ON public.restaurant_promotions(restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_promotions_is_active_idx
  ON public.restaurant_promotions(is_active);

ALTER TABLE public.restaurant_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_promotions"
  ON public.restaurant_promotions FOR SELECT USING (true);

CREATE POLICY "delivery_companies_manage_promotions"
  ON public.restaurant_promotions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.delivery_company_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.delivery_company_id = auth.uid()
    )
  );

CREATE POLICY "admins_manage_all_promotions"
  ON public.restaurant_promotions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

GRANT SELECT ON public.restaurant_promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_promotions TO authenticated;

-- ─────────────────────────────────────────────
-- 4. restaurant_cuisines
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restaurant_cuisines (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar    text    NOT NULL,
  image_url  text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_cuisines"
  ON public.restaurant_cuisines FOR SELECT USING (true);

CREATE POLICY "admins_manage_cuisines"
  ON public.restaurant_cuisines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

GRANT SELECT ON public.restaurant_cuisines TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_cuisines TO authenticated;

-- ─────────────────────────────────────────────
-- 5. service_types
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_types (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar    text    NOT NULL,
  image_url  text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_read_service_types"
  ON public.service_types FOR SELECT USING (true);

CREATE POLICY "admins_manage_service_types"
  ON public.service_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

GRANT SELECT ON public.service_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_types TO authenticated;

-- ─────────────────────────────────────────────
-- Done ✓
-- ─────────────────────────────────────────────
