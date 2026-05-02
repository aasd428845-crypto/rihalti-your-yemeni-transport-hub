
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS image_url text;
