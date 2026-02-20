
-- Admin settings table for commission rates and configurations
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read settings" ON public.admin_settings
  FOR SELECT TO authenticated
  USING (true);

-- Insert default commission settings
INSERT INTO public.admin_settings (key, value, description) VALUES
  ('booking_commission', '10', 'نسبة العمولة على الحجوزات (%)'),
  ('shipping_commission', '15', 'نسبة العمولة على الشحنات (%)'),
  ('delivery_commission', '12', 'نسبة العمولة على التوصيل (%)'),
  ('auto_approve_bookings', 'false', 'الموافقة التلقائية على الحجوزات'),
  ('auto_approve_shipments', 'false', 'الموافقة التلقائية على الشحنات');

-- Approval requests table
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('supplier_registration', 'delivery_registration', 'booking', 'shipment')),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  data jsonb DEFAULT '{}',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.approval_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id);

CREATE POLICY "Users can create requests" ON public.approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins can manage all requests" ON public.approval_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on admin_settings
CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
