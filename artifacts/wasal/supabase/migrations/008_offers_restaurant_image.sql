-- Add restaurant linkage, image, and badge text to delivery_company_offers
ALTER TABLE delivery_company_offers ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL;
ALTER TABLE delivery_company_offers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE delivery_company_offers ADD COLUMN IF NOT EXISTS badge_text TEXT;
