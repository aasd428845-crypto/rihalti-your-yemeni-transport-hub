
-- Trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  from_city text NOT NULL,
  to_city text NOT NULL,
  departure_time timestamptz NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  available_seats int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage trips" ON public.trips FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Suppliers can manage own trips" ON public.trips FOR ALL USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY "Anyone can view approved trips" ON public.trips FOR SELECT USING (status = 'approved');

-- Shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  supplier_id uuid,
  pickup_location text NOT NULL,
  delivery_location text NOT NULL,
  weight numeric,
  description text,
  status text NOT NULL DEFAULT 'pending',
  payment_method text DEFAULT 'cash',
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage shipments" ON public.shipments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers can view own shipments" ON public.shipments FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Suppliers can view assigned shipments" ON public.shipments FOR SELECT USING (auth.uid() = supplier_id);

-- Deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  delivery_partner_id uuid,
  restaurant_name text,
  items jsonb DEFAULT '[]',
  delivery_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text DEFAULT 'cash',
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage deliveries" ON public.deliveries FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers can view own deliveries" ON public.deliveries FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Partners can view assigned deliveries" ON public.deliveries FOR SELECT USING (auth.uid() = delivery_partner_id);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id uuid,
  type text NOT NULL,
  reference_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  partner_earning numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  refunded_at timestamptz
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage transactions" ON public.transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  partner_role text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  bank_account_details jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage payouts" ON public.payouts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners can view own payouts" ON public.payouts FOR SELECT USING (auth.uid() = partner_id);

-- Partner bank accounts
CREATE TABLE IF NOT EXISTS public.partner_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  iban text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bank accounts" ON public.partner_bank_accounts FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners can manage own accounts" ON public.partner_bank_accounts FOR ALL USING (auth.uid() = partner_id) WITH CHECK (auth.uid() = partner_id);

-- Cancellation requests
CREATE TABLE IF NOT EXISTS public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  refund_amount numeric DEFAULT 0,
  refund_status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage cancellations" ON public.cancellation_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own cancellations" ON public.cancellation_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create cancellations" ON public.cancellation_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Privacy policies
CREATE TABLE IF NOT EXISTS public.privacy_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  version int NOT NULL DEFAULT 1,
  effective_date timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.privacy_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage policies" ON public.privacy_policies FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read policies" ON public.privacy_policies FOR SELECT USING (true);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Invitation tokens
CREATE TABLE IF NOT EXISTS public.invitation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage invitations" ON public.invitation_tokens FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid,
  subject text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage conversations" ON public.conversations FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage messages" ON public.messages FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Conversation participants can view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (user_id = auth.uid() OR admin_id = auth.uid()))
);
CREATE POLICY "Conversation participants can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND (user_id = auth.uid() OR admin_id = auth.uid()))
);

-- Enable realtime for notifications and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add update triggers
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_privacy_policies_updated_at BEFORE UPDATE ON public.privacy_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
