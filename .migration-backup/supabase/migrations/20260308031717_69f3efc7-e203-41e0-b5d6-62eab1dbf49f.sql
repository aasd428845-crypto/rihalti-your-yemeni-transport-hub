
-- Add missing columns to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cuisine_type TEXT[];
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS opening_hours JSONB;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS min_order_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS estimated_delivery_time INTEGER;

-- Add missing columns to menu_categories
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add missing columns to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS calories INTEGER;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ingredients TEXT[];

-- Create menu_item_options table
CREATE TABLE IF NOT EXISTS menu_item_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  option_type TEXT CHECK (option_type IN ('size', 'extra', 'remove')),
  choices JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  max_selections INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create restaurant_reviews table
CREATE TABLE IF NOT EXISTS restaurant_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create carts table
CREATE TABLE IF NOT EXISTS carts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- RLS for menu_item_options
CREATE POLICY "Anyone can view menu_item_options" ON menu_item_options FOR SELECT USING (true);
CREATE POLICY "Company owners manage menu_item_options" ON menu_item_options FOR ALL USING (
  EXISTS (SELECT 1 FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id WHERE mi.id = menu_item_options.menu_item_id AND r.delivery_company_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM menu_items mi JOIN restaurants r ON r.id = mi.restaurant_id WHERE mi.id = menu_item_options.menu_item_id AND r.delivery_company_id = auth.uid())
);
CREATE POLICY "Admins manage menu_item_options" ON menu_item_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for restaurant_reviews
CREATE POLICY "Anyone can view restaurant_reviews" ON restaurant_reviews FOR SELECT USING (true);
CREATE POLICY "Customers can create reviews" ON restaurant_reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can manage own reviews" ON restaurant_reviews FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins manage reviews" ON restaurant_reviews FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for carts
CREATE POLICY "Customers manage own carts" ON carts FOR ALL USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- Add admin policy for restaurants
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage restaurants' AND tablename = 'restaurants') THEN
    CREATE POLICY "Admins manage restaurants" ON restaurants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Add public read policy for active restaurants if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public view active restaurants' AND tablename = 'restaurants') THEN
    CREATE POLICY "Public view active restaurants" ON restaurants FOR SELECT USING (is_active = true);
  END IF;
END $$;
