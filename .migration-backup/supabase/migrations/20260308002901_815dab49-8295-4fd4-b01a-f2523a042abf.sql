
-- 1. جدول الطلبات الموحد (شحنة / توصيل / سيارة أجرة)
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL DEFAULT 'REQ-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  type TEXT NOT NULL CHECK (type IN ('shipment', 'delivery', 'taxi')),
  status TEXT NOT NULL DEFAULT 'pending_price' 
    CHECK (status IN (
      'pending_price', 'price_sent', 'approved', 'in_progress', 'completed', 'cancelled'
    )),
  
  customer_id UUID NOT NULL,
  customer_display_id TEXT NOT NULL DEFAULT '',
  
  partner_id UUID,
  partner_type TEXT CHECK (partner_type IN ('supplier', 'delivery', 'taxi')),
  
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  
  receiver_name TEXT,
  receiver_phone_masked TEXT,
  receiver_phone TEXT,
  
  proposed_price NUMERIC(10,0),
  agreed_price NUMERIC(10,0),
  platform_commission_rate NUMERIC(5,2) DEFAULT 10.00,
  platform_commission NUMERIC(10,0),
  partner_net NUMERIC(10,0),
  
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'confirmed')),
  
  whatsapp_shared BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 2. جدول الدردشة المحمية
CREATE TABLE IF NOT EXISTS request_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'partner', 'admin')),
  message TEXT NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول الأسعار المرجعية
CREATE TABLE IF NOT EXISTS partner_price_references (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('shipment', 'delivery', 'taxi')),
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  item_description TEXT,
  reference_price NUMERIC(10,0) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_price_references ENABLE ROW LEVEL SECURITY;

-- service_requests policies
CREATE POLICY "customer_own_requests" ON service_requests
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "partner_view_assigned_requests" ON service_requests
  FOR SELECT USING (auth.uid() = partner_id);

CREATE POLICY "partner_update_assigned_requests" ON service_requests
  FOR UPDATE USING (auth.uid() = partner_id);

CREATE POLICY "admin_all_requests" ON service_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- request_messages policies
CREATE POLICY "request_participants_messages" ON request_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = request_id
      AND (sr.customer_id = auth.uid() OR sr.partner_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = request_id
      AND (sr.customer_id = auth.uid() OR sr.partner_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- partner_price_references policies
CREATE POLICY "partner_own_prices" ON partner_price_references
  FOR ALL USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "public_read_prices" ON partner_price_references
  FOR SELECT USING (is_active = TRUE);

-- Function لإنشاء customer_display_id تلقائياً
CREATE OR REPLACE FUNCTION generate_customer_display_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.customer_display_id := 'عميل #' || (FLOOR(RANDOM() * 9000) + 1000)::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_customer_display_id
  BEFORE INSERT ON service_requests
  FOR EACH ROW EXECUTE FUNCTION generate_customer_display_id();

-- Function لحساب العمولة تلقائياً عند الموافقة
CREATE OR REPLACE FUNCTION calculate_service_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.agreed_price IS NOT NULL THEN
    NEW.platform_commission := FLOOR(NEW.agreed_price * NEW.platform_commission_rate / 100);
    NEW.partner_net := NEW.agreed_price - NEW.platform_commission;
    NEW.approved_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_service_request_update
  BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION calculate_service_commission();

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.request_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
