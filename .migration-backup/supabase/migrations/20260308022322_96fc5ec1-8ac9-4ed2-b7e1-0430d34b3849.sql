
-- ============================================
-- 1. Add negotiation columns to shipment_requests
-- ============================================
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS proposed_price DECIMAL(10,2);
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS customer_accepted BOOLEAN DEFAULT false;
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS negotiation_status TEXT DEFAULT 'pending';
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS price_offered_at TIMESTAMPTZ;
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS price_accepted_at TIMESTAMPTZ;
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS customer_phone_hidden BOOLEAN DEFAULT true;
ALTER TABLE shipment_requests ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- ============================================
-- 2. Add negotiation columns to delivery_orders
-- ============================================
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS proposed_price DECIMAL(10,2);
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_accepted BOOLEAN DEFAULT false;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS negotiation_status TEXT DEFAULT 'pending';
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS price_offered_at TIMESTAMPTZ;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS price_accepted_at TIMESTAMPTZ;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS customer_phone_hidden BOOLEAN DEFAULT true;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- ============================================
-- 3. Create ride_requests table
-- ============================================
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  driver_id UUID,
  from_city TEXT NOT NULL,
  to_city TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  ride_type TEXT DEFAULT 'one_way',
  passenger_count INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  proposed_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  customer_accepted BOOLEAN DEFAULT false,
  negotiation_status TEXT DEFAULT 'pending',
  price_offered_at TIMESTAMPTZ,
  price_accepted_at TIMESTAMPTZ,
  customer_phone_hidden BOOLEAN DEFAULT true,
  barcode TEXT,
  qr_code_url TEXT,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own ride_requests" ON ride_requests
  FOR ALL USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Drivers manage assigned ride_requests" ON ride_requests
  FOR ALL USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins manage ride_requests" ON ride_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 4. Create order_messages table (polymorphic chat)
-- ============================================
CREATE TABLE IF NOT EXISTS order_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can manage order_messages" ON order_messages
  FOR ALL USING (
    auth.uid() = sender_id
    OR EXISTS (
      SELECT 1 FROM shipment_requests WHERE id = order_messages.order_id AND (customer_id = auth.uid() OR supplier_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM delivery_orders WHERE id = order_messages.order_id AND (customer_id = auth.uid() OR delivery_company_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM ride_requests WHERE id = order_messages.order_id AND (customer_id = auth.uid() OR driver_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = sender_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================
-- 5. Create whatsapp_logs table
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  message_sent TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own whatsapp_logs" ON whatsapp_logs
  FOR ALL USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Admins manage whatsapp_logs" ON whatsapp_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 6. Create delivery_proof table
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_proof (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type TEXT NOT NULL,
  order_id UUID NOT NULL,
  barcode_scanned BOOLEAN DEFAULT false,
  scanned_at TIMESTAMPTZ,
  scanned_by UUID,
  recipient_name TEXT,
  signature_url TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delivery_proof ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage delivery_proof" ON delivery_proof
  FOR ALL USING (
    auth.uid() = scanned_by
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = scanned_by
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Anyone can read delivery_proof" ON delivery_proof
  FOR SELECT USING (true);

-- ============================================
-- 7. Enable realtime for order_messages
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
