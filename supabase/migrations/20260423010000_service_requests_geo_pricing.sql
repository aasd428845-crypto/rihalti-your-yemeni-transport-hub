-- Add geo + pricing fields for the redesigned delivery request flow
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS from_lat double precision;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS from_lng double precision;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS to_lat   double precision;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS to_lng   double precision;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS distance_km     numeric(8,2);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS estimated_price numeric(10,2);
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS service_subtype text;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS package_size    text;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS sender_name     text;
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS sender_phone    text;
