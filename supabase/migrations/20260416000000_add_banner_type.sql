-- Add banner_type column to delivery_banners table
-- Values: 'carousel' (default, shown in the sliding carousel) or 'offer' (shown in the deals/offers section)
ALTER TABLE delivery_banners
  ADD COLUMN IF NOT EXISTS banner_type TEXT DEFAULT 'carousel' CHECK (banner_type IN ('carousel', 'offer'));

-- Update all existing banners to be carousel type
UPDATE delivery_banners SET banner_type = 'carousel' WHERE banner_type IS NULL;
