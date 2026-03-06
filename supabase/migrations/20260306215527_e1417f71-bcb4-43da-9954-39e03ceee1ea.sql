
-- 1. Financial transactions table
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('booking', 'shipment', 'delivery', 'ride')),
  reference_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  partner_earning DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'YER',
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'wallet', 'later')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Partner commission settings
CREATE TABLE IF NOT EXISTS public.partner_commission_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value DECIMAL(5,2) NOT NULL DEFAULT 10,
  override_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id)
);

-- 3. Partner invoices
CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_transactions INT NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'YER',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payment logs
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES public.partner_invoices(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'wallet')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  received_by UUID,
  notes TEXT
);

-- 5. Accounting settings (single row)
CREATE TABLE IF NOT EXISTS public.accounting_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  global_commission_booking DECIMAL(5,2) NOT NULL DEFAULT 10,
  global_commission_delivery DECIMAL(5,2) NOT NULL DEFAULT 12,
  global_commission_shipment DECIMAL(5,2) NOT NULL DEFAULT 15,
  global_commission_ride DECIMAL(5,2) NOT NULL DEFAULT 10,
  payment_due_days INT NOT NULL DEFAULT 7,
  auto_suspend_days INT NOT NULL DEFAULT 15,
  currency TEXT DEFAULT 'YER',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default accounting settings
INSERT INTO public.accounting_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 6. Violation logs
CREATE TABLE IF NOT EXISTS public.violation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  violation_type TEXT CHECK (violation_type IN ('phone_number', 'whatsapp_link', 'external_contact', 'other')),
  details TEXT,
  related_entity_id UUID,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_logs ENABLE ROW LEVEL SECURITY;

-- financial_transactions policies
CREATE POLICY "Admins full access financial_transactions" ON public.financial_transactions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners view own financial_transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (auth.uid() = partner_id);
CREATE POLICY "Customers view own financial_transactions" ON public.financial_transactions
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Authenticated insert financial_transactions" ON public.financial_transactions
  FOR INSERT TO authenticated WITH CHECK (true);

-- partner_commission_settings policies
CREATE POLICY "Admins manage partner_commission_settings" ON public.partner_commission_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners view own commission_settings" ON public.partner_commission_settings
  FOR SELECT TO authenticated USING (auth.uid() = partner_id);

-- partner_invoices policies
CREATE POLICY "Admins manage partner_invoices" ON public.partner_invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners view own invoices" ON public.partner_invoices
  FOR SELECT TO authenticated USING (auth.uid() = partner_id);

-- payment_logs policies
CREATE POLICY "Admins manage payment_logs" ON public.payment_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- accounting_settings policies
CREATE POLICY "Admins manage accounting_settings" ON public.accounting_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read accounting_settings" ON public.accounting_settings
  FOR SELECT TO authenticated USING (true);

-- violation_logs policies
CREATE POLICY "Admins manage violation_logs" ON public.violation_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own violations" ON public.violation_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
