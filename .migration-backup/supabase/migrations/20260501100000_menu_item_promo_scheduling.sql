-- Add time-based scheduling fields to menu_items promotions
-- These allow restricting a promotion to specific dates, times, and days of the week.

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS promo_starts_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_ends_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_active_days TEXT[],
  ADD COLUMN IF NOT EXISTS promo_start_time TEXT,
  ADD COLUMN IF NOT EXISTS promo_end_time   TEXT;

-- Index for efficient queries when checking active promos
CREATE INDEX IF NOT EXISTS idx_menu_items_promo_active
  ON menu_items (promo_active, promo_ends_at)
  WHERE promo_active = true;
