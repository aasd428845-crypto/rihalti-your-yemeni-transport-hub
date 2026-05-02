-- ─────────────────────────────────────────────────────────────────────────────
-- Ratings & Favorites system
-- Adds menu_item_reviews + customer_favorites + auto-aggregation triggers
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Add rating + total_ratings columns to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- 2) Menu item reviews table
CREATE TABLE IF NOT EXISTS menu_item_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  order_id UUID,
  rating INTEGER NOT NULL,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_menu_item_review()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_menu_item_review ON menu_item_reviews;
CREATE TRIGGER trg_validate_menu_item_review
  BEFORE INSERT OR UPDATE ON menu_item_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_menu_item_review();

ALTER TABLE menu_item_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view menu_item_reviews" ON menu_item_reviews;
CREATE POLICY "Anyone can view menu_item_reviews"
  ON menu_item_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Customers manage own item reviews" ON menu_item_reviews;
CREATE POLICY "Customers manage own item reviews"
  ON menu_item_reviews FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Admins manage menu_item_reviews" ON menu_item_reviews;
CREATE POLICY "Admins manage menu_item_reviews"
  ON menu_item_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_menu_item_reviews_item ON menu_item_reviews(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_reviews_customer ON menu_item_reviews(customer_id);

-- 3) Trigger to auto-update menu_items.rating + total_ratings
CREATE OR REPLACE FUNCTION public.refresh_menu_item_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target UUID := COALESCE(NEW.menu_item_id, OLD.menu_item_id);
  avg_r NUMERIC;
  cnt_r INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO avg_r, cnt_r
  FROM menu_item_reviews WHERE menu_item_id = target;
  UPDATE menu_items
    SET rating = COALESCE(ROUND(avg_r::numeric, 2), 0),
        total_ratings = COALESCE(cnt_r, 0)
    WHERE id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_menu_item_rating ON menu_item_reviews;
CREATE TRIGGER trg_refresh_menu_item_rating
  AFTER INSERT OR UPDATE OR DELETE ON menu_item_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_menu_item_rating();

-- 4) Trigger to auto-update restaurants.rating + total_ratings
CREATE OR REPLACE FUNCTION public.refresh_restaurant_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target UUID := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
  avg_r NUMERIC;
  cnt_r INTEGER;
BEGIN
  SELECT AVG(rating), COUNT(*) INTO avg_r, cnt_r
  FROM restaurant_reviews WHERE restaurant_id = target;
  UPDATE restaurants
    SET rating = COALESCE(ROUND(avg_r::numeric, 2), 0),
        total_ratings = COALESCE(cnt_r, 0)
    WHERE id = target;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_restaurant_rating ON restaurant_reviews;
CREATE TRIGGER trg_refresh_restaurant_rating
  AFTER INSERT OR UPDATE OR DELETE ON restaurant_reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_restaurant_rating();

-- 5) Customer favorites (works for both restaurants and menu_items)
CREATE TABLE IF NOT EXISTS customer_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, entity_type, entity_id)
);

CREATE OR REPLACE FUNCTION public.validate_favorite_entity_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_type NOT IN ('restaurant', 'menu_item') THEN
    RAISE EXCEPTION 'Invalid entity_type for favorite';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_favorite_entity ON customer_favorites;
CREATE TRIGGER trg_validate_favorite_entity
  BEFORE INSERT OR UPDATE ON customer_favorites
  FOR EACH ROW EXECUTE FUNCTION public.validate_favorite_entity_type();

ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers manage own favorites" ON customer_favorites;
CREATE POLICY "Customers manage own favorites"
  ON customer_favorites FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE INDEX IF NOT EXISTS idx_favorites_customer ON customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_entity ON customer_favorites(entity_type, entity_id);
