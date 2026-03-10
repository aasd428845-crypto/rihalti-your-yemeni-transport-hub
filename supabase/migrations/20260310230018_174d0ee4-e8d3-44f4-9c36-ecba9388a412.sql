
-- Delivery zones for coverage areas & pricing
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_company_id UUID NOT NULL,
  zone_name TEXT NOT NULL,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  estimated_time TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own zones" ON public.delivery_zones
  FOR ALL TO authenticated
  USING (delivery_company_id = auth.uid())
  WITH CHECK (delivery_company_id = auth.uid());

CREATE POLICY "Customers read active zones" ON public.delivery_zones
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Delivery quote requests table
CREATE TABLE public.delivery_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_company_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  order_id UUID,
  customer_address TEXT NOT NULL,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  quoted_fee NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.delivery_quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer manages own quotes" ON public.delivery_quote_requests
  FOR ALL TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Partner manages own quotes" ON public.delivery_quote_requests
  FOR ALL TO authenticated
  USING (delivery_company_id = auth.uid())
  WITH CHECK (delivery_company_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_quote_requests;

-- Partner settings table
CREATE TABLE IF NOT EXISTS public.partner_settings (
  partner_id UUID PRIMARY KEY,
  allow_direct_payment BOOLEAN DEFAULT true,
  cash_on_delivery_enabled BOOLEAN DEFAULT true,
  cash_on_ride_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.partner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner manages own settings" ON public.partner_settings
  FOR ALL TO authenticated
  USING (partner_id = auth.uid())
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Authenticated read partner settings" ON public.partner_settings
  FOR SELECT TO authenticated
  USING (true);
