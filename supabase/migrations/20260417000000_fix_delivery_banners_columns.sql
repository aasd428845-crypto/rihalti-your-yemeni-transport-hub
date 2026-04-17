-- Fix delivery_banners table: add missing columns
-- Run this in your Supabase SQL Editor

ALTER TABLE public.delivery_banners
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_type TEXT DEFAULT 'carousel',
  ADD COLUMN IF NOT EXISTS tile_action TEXT DEFAULT 'restaurants',
  ADD COLUMN IF NOT EXISTS tile_gradient TEXT DEFAULT 'from-orange-500 to-amber-500';

-- Update existing banners to carousel type if not set
UPDATE public.delivery_banners SET banner_type = 'carousel' WHERE banner_type IS NULL;
