-- Add missing city column to restaurants table
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS city text;

-- Add index for city-based queries
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON public.restaurants(city);

-- Also ensure latitude/longitude columns exist (used in delivery restaurant form)
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS longitude double precision;
