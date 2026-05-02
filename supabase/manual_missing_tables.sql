CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  phone_secondary TEXT,
  city TEXT,
  district TEXT,
  avatar_url TEXT,
  account_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_trial_active BOOLEAN DEFAULT false,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'supplier', 'delivery_company', 'admin', 'driver', 'delivery_driver')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.privacy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  effective_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_id UUID,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_reply TEXT,
  replied_by UUID,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  payment_transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  period_type TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.violation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  partner_role TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  bank_account_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value DECIMAL(5,2) NOT NULL DEFAULT 10,
  override_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  available_seats INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  supplier_id UUID,
  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  weight NUMERIC,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  delivery_partner_id UUID,
  restaurant_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  delivery_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'cash',
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  trip_id UUID NOT NULL,
  seat_count INT NOT NULL DEFAULT 1,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payer_name TEXT,
  payer_phone TEXT,
  payment_receipt_url TEXT,
  customer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  supplier_id UUID,
  pickup_address TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  pickup_landmark TEXT,
  delivery_landmark TEXT,
  shipment_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_approved BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  business_name TEXT,
  contact_phone TEXT,
  business_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  refund_amount NUMERIC DEFAULT 0,
  refund_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data JSONB,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  delivery_company_id UUID,
  is_online BOOLEAN DEFAULT false,
  earnings NUMERIC DEFAULT 0,
  vehicle_type TEXT,
  vehicle_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  customer_name TEXT,
  customer_address TEXT,
  restaurant_name TEXT,
  restaurant_id UUID,
  rider_id UUID,
  total NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'pending',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rider_cash_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  delivery_company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_pickup' CHECK (status IN ('pending_pickup', 'collected', 'settled', 'cancelled')),
  collected_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  settled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.restaurant_cuisines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_accounts ADD COLUMN IF NOT EXISTS owner_id UUID;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS delivery_company_id UUID;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS earnings NUMERIC DEFAULT 0;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS restaurant_id UUID;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS rider_id UUID;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.delivery_orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.shipment_requests ADD COLUMN IF NOT EXISTS pickup_landmark TEXT;
ALTER TABLE public.shipment_requests ADD COLUMN IF NOT EXISTS delivery_landmark TEXT;
ALTER TABLE public.partner_invoices ADD COLUMN IF NOT EXISTS period_type TEXT;
ALTER TABLE public.partner_invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS payment_transaction_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.violation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage admin_settings" ON public.admin_settings;
CREATE POLICY "Admins can manage admin_settings" ON public.admin_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone can read privacy policies" ON public.privacy_policies;
CREATE POLICY "Anyone can read privacy policies" ON public.privacy_policies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage privacy policies" ON public.privacy_policies;
CREATE POLICY "Admins can manage privacy policies" ON public.privacy_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
CREATE POLICY "Admins can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage conversations" ON public.conversations;
CREATE POLICY "Admins can manage conversations" ON public.conversations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage messages" ON public.messages;
CREATE POLICY "Admins can manage messages" ON public.messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Conversation participants can view messages" ON public.messages;
CREATE POLICY "Conversation participants can view messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (user_id = auth.uid() OR admin_id = auth.uid())));
DROP POLICY IF EXISTS "Conversation participants can send messages" ON public.messages;
CREATE POLICY "Conversation participants can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (user_id = auth.uid() OR admin_id = auth.uid())));
DROP POLICY IF EXISTS "Admins can manage support messages" ON public.support_messages;
CREATE POLICY "Admins can manage support messages" ON public.support_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage financial_transactions" ON public.financial_transactions;
CREATE POLICY "Admins manage financial_transactions" ON public.financial_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Partners view own financial_transactions" ON public.financial_transactions;
CREATE POLICY "Partners view own financial_transactions" ON public.financial_transactions FOR SELECT TO authenticated USING (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Customers view own financial_transactions" ON public.financial_transactions;
CREATE POLICY "Customers view own financial_transactions" ON public.financial_transactions FOR SELECT TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Admins manage partner_invoices" ON public.partner_invoices;
CREATE POLICY "Admins manage partner_invoices" ON public.partner_invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Partners view own invoices" ON public.partner_invoices;
CREATE POLICY "Partners view own invoices" ON public.partner_invoices FOR SELECT TO authenticated USING (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Admins manage accounting_settings" ON public.accounting_settings;
CREATE POLICY "Admins manage accounting_settings" ON public.accounting_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone can read accounting_settings" ON public.accounting_settings;
CREATE POLICY "Anyone can read accounting_settings" ON public.accounting_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage payment_accounts" ON public.payment_accounts;
CREATE POLICY "Admins can manage payment_accounts" ON public.payment_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Partners manage own payment_accounts" ON public.payment_accounts;
CREATE POLICY "Partners manage own payment_accounts" ON public.payment_accounts FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Admins can manage platform bank accounts" ON public.platform_bank_accounts;
CREATE POLICY "Admins can manage platform bank accounts" ON public.platform_bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone can view active platform bank accounts" ON public.platform_bank_accounts;
CREATE POLICY "Anyone can view active platform bank accounts" ON public.platform_bank_accounts FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage partner bank accounts" ON public.partner_bank_accounts;
CREATE POLICY "Admins can manage partner bank accounts" ON public.partner_bank_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Partners can manage own accounts" ON public.partner_bank_accounts;
CREATE POLICY "Partners can manage own accounts" ON public.partner_bank_accounts FOR ALL TO authenticated USING (auth.uid() = partner_id) WITH CHECK (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Admins manage payment_transactions" ON public.payment_transactions;
CREATE POLICY "Admins manage payment_transactions" ON public.payment_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users manage own payment_transactions" ON public.payment_transactions;
CREATE POLICY "Users manage own payment_transactions" ON public.payment_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Partners view related payment_transactions" ON public.payment_transactions;
CREATE POLICY "Partners view related payment_transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Partners update related payment_transactions" ON public.payment_transactions;
CREATE POLICY "Partners update related payment_transactions" ON public.payment_transactions FOR UPDATE TO authenticated USING (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payouts;
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Partners can view own payouts" ON public.payouts;
CREATE POLICY "Partners can view own payouts" ON public.payouts FOR SELECT TO authenticated USING (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Admins manage partner_commission_settings" ON public.partner_commission_settings;
CREATE POLICY "Admins manage partner_commission_settings" ON public.partner_commission_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Partners view own commission_settings" ON public.partner_commission_settings;
CREATE POLICY "Partners view own commission_settings" ON public.partner_commission_settings FOR SELECT TO authenticated USING (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Admins can manage trips" ON public.trips;
CREATE POLICY "Admins can manage trips" ON public.trips FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Suppliers can manage own trips" ON public.trips;
CREATE POLICY "Suppliers can manage own trips" ON public.trips FOR ALL TO authenticated USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);
DROP POLICY IF EXISTS "Anyone can view approved trips" ON public.trips;
CREATE POLICY "Anyone can view approved trips" ON public.trips FOR SELECT TO authenticated USING (status = 'approved');
DROP POLICY IF EXISTS "Admins can manage shipments" ON public.shipments;
CREATE POLICY "Admins can manage shipments" ON public.shipments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Customers can view own shipments" ON public.shipments;
CREATE POLICY "Customers can view own shipments" ON public.shipments FOR SELECT TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Suppliers can view assigned shipments" ON public.shipments;
CREATE POLICY "Suppliers can view assigned shipments" ON public.shipments FOR SELECT TO authenticated USING (auth.uid() = supplier_id);
DROP POLICY IF EXISTS "Admins can manage deliveries" ON public.deliveries;
CREATE POLICY "Admins can manage deliveries" ON public.deliveries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Customers can view own deliveries" ON public.deliveries;
CREATE POLICY "Customers can view own deliveries" ON public.deliveries FOR SELECT TO authenticated USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Partners can view assigned deliveries" ON public.deliveries;
CREATE POLICY "Partners can view assigned deliveries" ON public.deliveries FOR SELECT TO authenticated USING (auth.uid() = delivery_partner_id);
DROP POLICY IF EXISTS "Admins can manage bookings" ON public.bookings;
CREATE POLICY "Admins can manage bookings" ON public.bookings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
CREATE POLICY "Customers can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Admins can manage shipment requests" ON public.shipment_requests;
CREATE POLICY "Admins can manage shipment requests" ON public.shipment_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage partner join requests" ON public.partner_join_requests;
CREATE POLICY "Admins can manage partner join requests" ON public.partner_join_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage cancellation requests" ON public.cancellation_requests;
CREATE POLICY "Admins can manage cancellation requests" ON public.cancellation_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users can view own cancellations" ON public.cancellation_requests;
CREATE POLICY "Users can view own cancellations" ON public.cancellation_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create cancellations" ON public.cancellation_requests;
CREATE POLICY "Users can create cancellations" ON public.cancellation_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage approval requests" ON public.approval_requests;
CREATE POLICY "Admins can manage approval requests" ON public.approval_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins can manage riders" ON public.riders;
CREATE POLICY "Admins can manage riders" ON public.riders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Company manages its rider collections" ON public.rider_cash_collections;
CREATE POLICY "Company manages its rider collections" ON public.rider_cash_collections FOR ALL TO authenticated USING (delivery_company_id = auth.uid()) WITH CHECK (delivery_company_id = auth.uid());
DROP POLICY IF EXISTS "Rider views own collections" ON public.rider_cash_collections;
CREATE POLICY "Rider views own collections" ON public.rider_cash_collections FOR SELECT TO authenticated USING (rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Anyone can view active service types" ON public.service_types;
CREATE POLICY "Anyone can view active service types" ON public.service_types FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage service types" ON public.service_types;
CREATE POLICY "Admins can manage service types" ON public.service_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone can view active restaurant cuisines" ON public.restaurant_cuisines;
CREATE POLICY "Anyone can view active restaurant cuisines" ON public.restaurant_cuisines FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage restaurant cuisines" ON public.restaurant_cuisines;
CREATE POLICY "Admins can manage restaurant cuisines" ON public.restaurant_cuisines FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_settings_key ON public.admin_settings(key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_privacy_policies_role ON public.privacy_policies(role);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_partner_id ON public.financial_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_customer_id ON public.financial_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_partner_id ON public.partner_invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_partner_id ON public.payment_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON public.support_messages(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_types_name_ar ON public.service_types(name_ar);
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_cuisines_name_ar ON public.restaurant_cuisines(name_ar);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_cash_one_active_per_order ON public.rider_cash_collections(order_id) WHERE status IN ('pending_pickup', 'collected');

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_privacy_policies_updated_at ON public.privacy_policies;
CREATE TRIGGER update_privacy_policies_updated_at BEFORE UPDATE ON public.privacy_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_shipment_requests_updated_at ON public.shipment_requests;
CREATE TRIGGER update_shipment_requests_updated_at BEFORE UPDATE ON public.shipment_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_partner_commission_settings_updated_at ON public.partner_commission_settings;
CREATE TRIGGER update_partner_commission_settings_updated_at BEFORE UPDATE ON public.partner_commission_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_platform_bank_accounts_updated_at ON public.platform_bank_accounts;
CREATE TRIGGER update_platform_bank_accounts_updated_at BEFORE UPDATE ON public.platform_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_delivery_orders_updated_at ON public.delivery_orders;
CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS update_riders_updated_at ON public.riders;
CREATE TRIGGER update_riders_updated_at BEFORE UPDATE ON public.riders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_touch_rider_cash_collections ON public.rider_cash_collections;
CREATE TRIGGER trg_touch_rider_cash_collections BEFORE UPDATE ON public.rider_cash_collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.accounting_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.platform_bank_accounts (bank_name, account_name, account_number, iban)
VALUES
  ('بنك الكريمي', 'شركة رحلاتي للتقنية', '1234567890', 'YE12KREM1234567890'),
  ('بنك التسليف التعاوني', 'شركة رحلاتي للتقنية', '0987654321', 'YE12COOP1234567890')
ON CONFLICT DO NOTHING;
INSERT INTO public.service_types (name_ar, image_url, sort_order) VALUES
('مطاعم', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&fit=crop', 1),
('بقالة', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&fit=crop', 2),
('صيدلية', 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600&q=80&fit=crop', 3)
ON CONFLICT DO NOTHING;
INSERT INTO public.restaurant_cuisines (name_ar, image_url, sort_order) VALUES
('يمني', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&fit=crop', 1),
('برجر', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop', 2),
('بيتزا', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop', 3),
('مأكولات بحرية', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop', 4),
('حلويات', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80&fit=crop', 5),
('مشروبات', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&fit=crop', 6),
('شاورما', 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&q=80&fit=crop', 7),
('مرق', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80&fit=crop', 8)
ON CONFLICT DO NOTHING;