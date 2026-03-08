
-- Promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  delivery_company_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT DEFAULT 'percentage',
  discount_value NUMERIC DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  promo_code TEXT,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company owners manage own promotions" ON public.promotions FOR ALL USING (auth.uid() = delivery_company_id) WITH CHECK (auth.uid() = delivery_company_id);

CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT USING (is_active = true);
