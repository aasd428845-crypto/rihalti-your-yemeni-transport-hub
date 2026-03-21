-- Run this migration in the Supabase SQL Editor

-- 1. restaurants table - add missing columns
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cuisine_type TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS estimated_delivery_time INTEGER;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- 2. menu_items table - add missing columns
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS calories INTEGER;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ingredients TEXT[];
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS preparation_time INTEGER;

-- 3. menu_item_options table - create if not exists
CREATE TABLE IF NOT EXISTS menu_item_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  option_type TEXT DEFAULT 'single',
  choices JSONB,
  is_required BOOLEAN DEFAULT false,
  max_selections INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on menu_item_options if not already enabled
ALTER TABLE menu_item_options ENABLE ROW LEVEL SECURITY;

-- Allow public read access for menu_item_options
CREATE POLICY IF NOT EXISTS "Public can read menu_item_options"
  ON menu_item_options FOR SELECT USING (true);

-- Allow delivery companies to manage options
CREATE POLICY IF NOT EXISTS "Authenticated can manage menu_item_options"
  ON menu_item_options FOR ALL USING (auth.role() = 'authenticated');
