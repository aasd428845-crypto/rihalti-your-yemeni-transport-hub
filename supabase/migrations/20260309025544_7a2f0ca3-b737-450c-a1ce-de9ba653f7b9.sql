ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;