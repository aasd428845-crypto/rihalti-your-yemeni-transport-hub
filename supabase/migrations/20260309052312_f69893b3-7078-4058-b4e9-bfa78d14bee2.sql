
-- Platform bank accounts for receiving customer payments
CREATE TABLE IF NOT EXISTS public.platform_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  swift_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform bank accounts"
  ON public.platform_bank_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow public read for payment pages
CREATE POLICY "Anyone can view active platform bank accounts"
  ON public.platform_bank_accounts FOR SELECT TO anon, authenticated
  USING (is_active = true);
