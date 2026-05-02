
-- جدول المناطق (محافظات يمنية ودول)
CREATE TABLE public.regions (
  id SERIAL PRIMARY KEY,
  name_ar TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('city', 'governorate', 'country')),
  parent_id INTEGER REFERENCES public.regions(id),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Admins can manage regions" ON public.regions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- إدخال المحافظات اليمنية
INSERT INTO public.regions (name_ar, type) VALUES
('صنعاء', 'governorate'), ('عدن', 'governorate'), ('تعز', 'governorate'),
('الحديدة', 'governorate'), ('إب', 'governorate'), ('ذمار', 'governorate'),
('حضرموت', 'governorate'), ('المكلا', 'governorate'), ('مأرب', 'governorate'),
('البيضاء', 'governorate'), ('لحج', 'governorate'), ('أبين', 'governorate'),
('شبوة', 'governorate'), ('حجة', 'governorate'), ('صعدة', 'governorate'),
('عمران', 'governorate'), ('الضالع', 'governorate'), ('المهرة', 'governorate'),
('ريمة', 'governorate'), ('الجوف', 'governorate'), ('سقطرى', 'governorate'),
('المملكة العربية السعودية', 'country'), ('سلطنة عمان', 'country'),
('الإمارات العربية المتحدة', 'country'), ('مصر', 'country'), ('الأردن', 'country');

-- جدول أنواع الرحلات
CREATE TABLE public.trip_types (
  id SERIAL PRIMARY KEY,
  name_ar TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE NOT NULL
);

ALTER TABLE public.trip_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read trip types" ON public.trip_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage trip types" ON public.trip_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.trip_types (name_ar, slug) VALUES
('محلية', 'local'), ('دولية', 'international'), ('عمرة', 'umrah'), ('حج', 'hajj');

-- توسيع جدول الرحلات
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES public.trip_types(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS period TEXT CHECK (period IN ('morning', 'evening'));
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS from_region_id INTEGER REFERENCES public.regions(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS to_region_id INTEGER REFERENCES public.regions(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS bus_company TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS bus_number TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS is_offer BOOLEAN DEFAULT false;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS offer_type TEXT CHECK (offer_type IN ('percentage', 'fixed'));
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS offer_value DECIMAL(10,2);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS offer_until TIMESTAMPTZ;

-- جدول الحجوزات
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id),
  customer_id UUID NOT NULL,
  seat_count INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'direct_to_supplier')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending_approval', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bookings" ON public.bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Suppliers can view trip bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.trips WHERE trips.id = bookings.trip_id AND trips.supplier_id = auth.uid())
);
CREATE POLICY "Suppliers can update trip bookings" ON public.bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.trips WHERE trips.id = bookings.trip_id AND trips.supplier_id = auth.uid())
);

-- جدول طلبات الشحن
CREATE TABLE public.shipment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  shipment_type TEXT NOT NULL CHECK (shipment_type IN ('door_to_door', 'office_to_office')),
  pickup_address TEXT,
  pickup_lat FLOAT,
  pickup_lng FLOAT,
  delivery_address TEXT,
  delivery_lat FLOAT,
  delivery_lng FLOAT,
  recipient_name TEXT,
  recipient_phone TEXT,
  item_description TEXT,
  item_weight DECIMAL(10,2),
  item_dimensions TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'pending_pricing', 'priced', 'accepted', 'rejected', 'cancelled')),
  admin_approved BOOLEAN DEFAULT false,
  supplier_priced BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'direct_to_supplier')),
  barcode TEXT UNIQUE,
  tracking_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipment_requests" ON public.shipment_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers can view own shipment_requests" ON public.shipment_requests FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create shipment_requests" ON public.shipment_requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Suppliers can view assigned shipment_requests" ON public.shipment_requests FOR SELECT USING (auth.uid() = supplier_id);
CREATE POLICY "Suppliers can update assigned shipment_requests" ON public.shipment_requests FOR UPDATE USING (auth.uid() = supplier_id);

-- جدول المعاملات المالية للمورد
CREATE TABLE public.supplier_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('platform_payout', 'external_income', 'external_expense', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier_transactions" ON public.supplier_transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Suppliers can manage own transactions" ON public.supplier_transactions FOR ALL USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);

-- جدول المناطق التي يعمل بها المورد
CREATE TABLE public.supplier_working_areas (
  supplier_id UUID NOT NULL,
  region_id INTEGER NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, region_id)
);

ALTER TABLE public.supplier_working_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage working areas" ON public.supplier_working_areas FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Suppliers can manage own areas" ON public.supplier_working_areas FOR ALL USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY "Anyone can read working areas" ON public.supplier_working_areas FOR SELECT USING (true);

-- جدول الصور العامة للمورد
CREATE TABLE public.supplier_public_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplier_public_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage public images" ON public.supplier_public_images FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Suppliers can manage own images" ON public.supplier_public_images FOR ALL USING (auth.uid() = supplier_id) WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY "Anyone can view public images" ON public.supplier_public_images FOR SELECT USING (true);
