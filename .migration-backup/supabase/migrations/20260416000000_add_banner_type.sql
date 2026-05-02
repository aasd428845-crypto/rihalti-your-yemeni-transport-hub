-- Add banner_type column to delivery_banners table
-- Values:
--   'carousel'     = sliding hero carousel at top
--   'offer'        = horizontal deals/offers row
--   'service_tile' = the 4 main service category tiles (managed per delivery company)
ALTER TABLE delivery_banners
  ADD COLUMN IF NOT EXISTS banner_type TEXT DEFAULT 'carousel'
    CHECK (banner_type IN ('carousel', 'offer', 'service_tile'));

-- Add tile_action column for service tiles (where pressing the tile navigates to)
ALTER TABLE delivery_banners
  ADD COLUMN IF NOT EXISTS tile_action TEXT DEFAULT 'restaurants';

-- Add tile_gradient column for service tiles background gradient
ALTER TABLE delivery_banners
  ADD COLUMN IF NOT EXISTS tile_gradient TEXT DEFAULT 'from-orange-500 to-amber-500';

-- Update all existing banners to be carousel type
UPDATE delivery_banners SET banner_type = 'carousel' WHERE banner_type IS NULL;
