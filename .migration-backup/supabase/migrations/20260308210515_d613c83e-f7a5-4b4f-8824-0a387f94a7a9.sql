
-- payment_accounts table
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID,
  account_type TEXT NOT NULL CHECK (account_type IN ('platform', 'partner')),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment_accounts" ON public.payment_accounts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners manage own payment_accounts" ON public.payment_accounts FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Anyone can view active platform accounts" ON public.payment_accounts FOR SELECT TO authenticated
  USING (account_type = 'platform' AND is_active = true);

CREATE POLICY "Anyone can view active partner accounts" ON public.payment_accounts FOR SELECT TO authenticated
  USING (is_active = true);

-- payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  related_entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('booking', 'shipment', 'delivery', 'ride')),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'wallet')),
  transfer_receipt_url TEXT,
  transfer_reference TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'completed')),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  partner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment_transactions" ON public.payment_transactions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users manage own payment_transactions" ON public.payment_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners view related payment_transactions" ON public.payment_transactions FOR SELECT TO authenticated
  USING (auth.uid() = partner_id);

CREATE POLICY "Partners update related payment_transactions" ON public.payment_transactions FOR UPDATE TO authenticated
  USING (auth.uid() = partner_id);

-- Add payment_transaction_id to financial_transactions
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS payment_transaction_id UUID;

-- Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins view all receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view related receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-receipts');

-- Insert default platform accounts
INSERT INTO public.payment_accounts (account_type, bank_name, account_name, account_number, iban) VALUES
  ('platform', 'بنك الكريمي', 'شركة رحلاتي للتقنية', '1234567890', 'YE12KREM1234567890'),
  ('platform', 'بنك التسليف التعاوني', 'شركة رحلاتي للتقنية', '0987654321', 'YE12COOP0987654321');
