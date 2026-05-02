ALTER TABLE public.shipment_requests 
  ADD COLUMN IF NOT EXISTS pickup_landmark TEXT,
  ADD COLUMN IF NOT EXISTS delivery_landmark TEXT;