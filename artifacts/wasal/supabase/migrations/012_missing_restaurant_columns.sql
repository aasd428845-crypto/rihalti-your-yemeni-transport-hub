-- ============================================================
-- وصال — إضافة الأعمدة الناقصة من جدول restaurants
-- شغّل هذا الملف مرة واحدة في:
--   Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ─── 1. عمود المطاعم المميزة ───────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_restaurants_is_featured
  ON restaurants (is_featured)
  WHERE is_featured = true;

-- ─── 2. ساعات العمل التفصيلية (JSONB لكل يوم) ──────────────
-- الشكل: { "saturday": { "open": true, "from": "09:00", "to": "23:00" }, ... }
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT NULL;

-- ─── 3. أعمدة وقت الفتح والإغلاق العامة ───────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS opening_time TEXT DEFAULT '09:00';

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '23:00';

-- ─── 4. سعر التوصيل لكل كيلومتر ────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS price_per_km NUMERIC(8,2) DEFAULT 0;

-- ─── 5. نسبة العمولة ────────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;

-- ─── 6. مناطق التغطية ───────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS coverage_areas TEXT[] DEFAULT '{}';

-- ─── 7. رسوم التوصيل الثابتة ────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(8,2) DEFAULT 0;

-- ─── 8. نسبة الخصم ──────────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0;

-- ─── 9. الوصف بالعربية ──────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS description_ar TEXT DEFAULT NULL;

-- ─── 10. إحداثيات GPS ───────────────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10,7) DEFAULT NULL;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7) DEFAULT NULL;

-- ─── 11. صورة الغلاف (بديل URL) ─────────────────────────────
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;

-- ============================================================
-- تحقق من النتيجة: يجب أن تظهر جميع الأعمدة أعلاه
-- ============================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'restaurants'
  AND column_name  IN (
    'is_featured', 'opening_hours', 'opening_time', 'closing_time',
    'price_per_km', 'commission_rate', 'coverage_areas',
    'delivery_fee', 'discount_percent', 'description_ar',
    'latitude', 'longitude', 'cover_image_url'
  )
ORDER BY column_name;
