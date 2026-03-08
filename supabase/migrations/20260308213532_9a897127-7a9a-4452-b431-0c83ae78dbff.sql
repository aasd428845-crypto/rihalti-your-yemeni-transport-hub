
-- Add delivery_driver to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_driver';

-- Create delivery_drivers table
CREATE TABLE IF NOT EXISTS public.delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_company_id UUID REFERENCES auth.users(id),
  license_number TEXT,
  vehicle_type TEXT DEFAULT 'motorcycle',
  vehicle_plate TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  total_deliveries INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

-- RLS: Delivery drivers manage own data
CREATE POLICY "Delivery drivers manage own data"
ON public.delivery_drivers FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS: Admins full access
CREATE POLICY "Admins full access delivery_drivers"
ON public.delivery_drivers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS: Delivery companies can view their drivers
CREATE POLICY "Companies view own delivery_drivers"
ON public.delivery_drivers FOR SELECT TO authenticated
USING (auth.uid() = delivery_company_id);

-- RLS: Delivery companies can update their drivers
CREATE POLICY "Companies update own delivery_drivers"
ON public.delivery_drivers FOR UPDATE TO authenticated
USING (auth.uid() = delivery_company_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_drivers;
