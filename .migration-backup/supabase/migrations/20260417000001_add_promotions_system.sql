-- ─── Promotions System ─────────────────────────────────────────────────────
-- Adds promo fields to menu_items and creates a restaurant_promotions table

-- 1. Add promo columns to menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS promo_type TEXT DEFAULT NULL
    CHECK (promo_type IN ('discount_percent', 'fixed_price', 'custom_text', NULL)),
  ADD COLUMN IF NOT EXISTS promo_value NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_text TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_active BOOLEAN DEFAULT false;

-- 2. Restaurant promotions (separate deals: delivery offers, combos, etc.)
CREATE TABLE IF NOT EXISTS public.restaurant_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  promo_type TEXT NOT NULL CHECK (promo_type IN (
    'free_delivery_min_order',  -- free delivery above amount
    'free_delivery_schedule',   -- free delivery on specific days/times
    'free_delivery_limited',    -- free delivery for limited period
    'discount_percent',         -- % off entire order
    'fixed_discount',           -- fixed amount off
    'buy_x_get_y',              -- buy 3 get 2, etc.
    'custom_text'               -- any custom promo text
  )),
  title TEXT NOT NULL,
  description TEXT,
  promo_text TEXT,
  -- Conditions
  min_order_amount NUMERIC DEFAULT NULL,
  discount_percent NUMERIC DEFAULT NULL,
  discount_amount NUMERIC DEFAULT NULL,
  buy_quantity INTEGER DEFAULT NULL,
  get_quantity INTEGER DEFAULT NULL,
  -- Schedule (for free_delivery_schedule)
  active_days TEXT[] DEFAULT NULL,  -- ['الجمعة', 'السبت']
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  -- Period (for limited promos)
  starts_at TIMESTAMPTZ DEFAULT NULL,
  ends_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.restaurant_promotions ENABLE ROW LEVEL SECURITY;

-- Delivery companies can manage their restaurant promotions
CREATE POLICY "delivery_manage_restaurant_promotions" ON public.restaurant_promotions
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE delivery_company_id = auth.uid()
    )
  );

-- Customers can view active promotions
CREATE POLICY "customers_view_active_promotions" ON public.restaurant_promotions
  FOR SELECT USING (is_active = true);
