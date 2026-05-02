CREATE TABLE IF NOT EXISTS public.delivery_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_company_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_tab TEXT DEFAULT 'restaurants',
  badge_text TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_companies_manage_banners" ON public.delivery_banners
  FOR ALL USING (delivery_company_id = auth.uid());

CREATE POLICY "customers_view_active_banners" ON public.delivery_banners
  FOR SELECT USING (is_active = true);
