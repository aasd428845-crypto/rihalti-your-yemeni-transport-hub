
-- Partner settings table
CREATE TABLE IF NOT EXISTS public.partner_settings (
  partner_id UUID PRIMARY KEY,
  allow_direct_payment BOOLEAN DEFAULT false,
  cash_on_delivery_enabled BOOLEAN DEFAULT true,
  cash_on_ride_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.partner_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner_settings" ON public.partner_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners manage own settings" ON public.partner_settings FOR ALL TO authenticated
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Anyone can read partner_settings" ON public.partner_settings FOR SELECT TO authenticated
  USING (true);

-- Add violation tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS violations_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_violation_date TIMESTAMPTZ;
