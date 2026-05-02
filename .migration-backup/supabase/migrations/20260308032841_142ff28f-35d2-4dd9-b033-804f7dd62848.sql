
-- 1. جدول السائقين
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  license_number TEXT,
  license_expiry DATE,
  years_experience INTEGER,
  bio TEXT,
  is_approved BOOLEAN DEFAULT false,
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  total_trips INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول المركبات
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year INTEGER,
  color TEXT,
  plate_number TEXT NOT NULL DEFAULT '',
  insurance_number TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول مستندات السائق
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'id_front',
  document_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول الرحلات المكتملة
CREATE TABLE IF NOT EXISTS public.rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.ride_requests(id) UNIQUE,
  driver_id UUID REFERENCES public.drivers(id),
  customer_id UUID NOT NULL,
  pickup_location TEXT,
  dropoff_location TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  platform_commission DECIMAL(10,2) DEFAULT 0,
  driver_earning DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'assigned',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  distance_km FLOAT,
  rating_by_customer INTEGER,
  rating_by_driver INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول تتبع موقع السائق
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE UNIQUE,
  lat FLOAT NOT NULL DEFAULT 0,
  lng FLOAT NOT NULL DEFAULT 0,
  heading FLOAT,
  speed FLOAT,
  is_online BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. إضافة أعمدة مفقودة لجدول ride_requests
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS pickup_lat FLOAT;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS pickup_lng FLOAT;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS dropoff_lat FLOAT;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS dropoff_lng FLOAT;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS waiting_time INTEGER;

-- RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Drivers RLS
CREATE POLICY "Drivers manage own data" ON public.drivers
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access drivers" ON public.drivers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view approved drivers" ON public.drivers
  FOR SELECT USING (is_approved = true);

-- Vehicles RLS
CREATE POLICY "Drivers manage own vehicles" ON public.vehicles
  FOR ALL USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = vehicles.driver_id AND drivers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = vehicles.driver_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Admins full access vehicles" ON public.vehicles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Driver Documents RLS
CREATE POLICY "Drivers manage own documents" ON public.driver_documents
  FOR ALL USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Admins full access driver_documents" ON public.driver_documents
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rides RLS
CREATE POLICY "Customers view own rides" ON public.rides
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Drivers view own rides" ON public.rides
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = rides.driver_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Drivers update own rides" ON public.rides
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = rides.driver_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Admins full access rides" ON public.rides
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated insert rides" ON public.rides
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Driver Locations RLS
CREATE POLICY "Drivers manage own location" ON public.driver_locations
  FOR ALL USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_locations.driver_id AND drivers.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_locations.driver_id AND drivers.user_id = auth.uid()));

CREATE POLICY "Anyone can view online driver locations" ON public.driver_locations
  FOR SELECT USING (is_online = true);

CREATE POLICY "Admins full access driver_locations" ON public.driver_locations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;
