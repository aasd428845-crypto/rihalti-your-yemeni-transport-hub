-- Fix menu_item_options_option_type_check constraint
-- Old values: 'size', 'extra', 'remove'
-- New values needed: 'single', 'multiple' (used by the UI form)
-- This migration expands the constraint to allow both old and new values.

ALTER TABLE menu_item_options
  DROP CONSTRAINT IF EXISTS menu_item_options_option_type_check;

ALTER TABLE menu_item_options
  ADD CONSTRAINT menu_item_options_option_type_check
  CHECK (option_type IN ('single', 'multiple', 'size', 'extra', 'remove'));

-- Also ensure image_url column exists on menu_categories (for category images)
ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS image_url TEXT;
