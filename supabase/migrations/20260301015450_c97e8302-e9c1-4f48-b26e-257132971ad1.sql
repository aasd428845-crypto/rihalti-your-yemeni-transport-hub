
-- Add image_url to trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add logo_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for trip images
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-images', 'trip-images', true) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for profile logos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-logos', 'profile-logos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for trip-images
CREATE POLICY "Anyone can view trip images" ON storage.objects FOR SELECT USING (bucket_id = 'trip-images');
CREATE POLICY "Authenticated users can upload trip images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trip-images');
CREATE POLICY "Users can update own trip images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'trip-images');
CREATE POLICY "Users can delete own trip images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'trip-images');

-- Storage policies for profile-logos
CREATE POLICY "Anyone can view profile logos" ON storage.objects FOR SELECT USING (bucket_id = 'profile-logos');
CREATE POLICY "Authenticated users can upload profile logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-logos');
CREATE POLICY "Users can update own profile logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile-logos');
CREATE POLICY "Users can delete own profile logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile-logos');

-- Insert comprehensive regions data
-- Yemen governorates
INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES
  ('اليمن', 'country', NULL, true)
ON CONFLICT DO NOTHING;

-- Get Yemen ID for parent references
DO $$
DECLARE
  yemen_id INTEGER;
  sa_id INTEGER;
  uae_id INTEGER;
  qatar_id INTEGER;
  kuwait_id INTEGER;
  oman_id INTEGER;
  bahrain_id INTEGER;
  jordan_id INTEGER;
  egypt_id INTEGER;
  turkey_id INTEGER;
  malaysia_id INTEGER;
BEGIN
  -- Insert Yemen if not exists and get ID
  SELECT id INTO yemen_id FROM regions WHERE name_ar = 'اليمن' AND type = 'country' LIMIT 1;
  IF yemen_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('اليمن', 'country', NULL, true) RETURNING id INTO yemen_id;
  END IF;

  -- Yemeni governorates (insert if not exists)
  INSERT INTO regions (name_ar, type, parent_id, is_active)
  SELECT name, 'governorate', yemen_id, true
  FROM (VALUES
    ('صنعاء'), ('عدن'), ('تعز'), ('حضرموت'), ('إب'), ('الحديدة'),
    ('ذمار'), ('المكلا'), ('عمران'), ('صعدة'), ('حجة'), ('البيضاء'),
    ('لحج'), ('أبين'), ('الضالع'), ('المحويت'), ('ريمة'), ('مأرب'),
    ('شبوة'), ('الجوف'), ('المهرة'), ('سقطرى')
  ) AS t(name)
  WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = t.name AND parent_id = yemen_id);

  -- Saudi Arabia
  SELECT id INTO sa_id FROM regions WHERE name_ar = 'السعودية' AND type = 'country' LIMIT 1;
  IF sa_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('السعودية', 'country', NULL, true) RETURNING id INTO sa_id;
  END IF;

  INSERT INTO regions (name_ar, type, parent_id, is_active)
  SELECT name, 'city', sa_id, true
  FROM (VALUES ('الرياض'), ('جدة'), ('الدمام'), ('مكة المكرمة'), ('المدينة المنورة'), ('الطائف'), ('تبوك'), ('بريدة'), ('خميس مشيط'), ('نجران'), ('جازان'), ('ينبع')) AS t(name)
  WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = t.name AND parent_id = sa_id);

  -- UAE
  SELECT id INTO uae_id FROM regions WHERE name_ar = 'الإمارات' AND type = 'country' LIMIT 1;
  IF uae_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('الإمارات', 'country', NULL, true) RETURNING id INTO uae_id;
  END IF;

  INSERT INTO regions (name_ar, type, parent_id, is_active)
  SELECT name, 'city', uae_id, true
  FROM (VALUES ('دبي'), ('أبوظبي'), ('الشارقة'), ('عجمان'), ('رأس الخيمة'), ('الفجيرة'), ('أم القيوين')) AS t(name)
  WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = t.name AND parent_id = uae_id);

  -- Qatar
  SELECT id INTO qatar_id FROM regions WHERE name_ar = 'قطر' AND type = 'country' LIMIT 1;
  IF qatar_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('قطر', 'country', NULL, true) RETURNING id INTO qatar_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT 'الدوحة', 'city', qatar_id, true WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = 'الدوحة' AND parent_id = qatar_id);

  -- Kuwait
  SELECT id INTO kuwait_id FROM regions WHERE name_ar = 'الكويت' AND type = 'country' LIMIT 1;
  IF kuwait_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('الكويت', 'country', NULL, true) RETURNING id INTO kuwait_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT 'مدينة الكويت', 'city', kuwait_id, true WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = 'مدينة الكويت' AND parent_id = kuwait_id);

  -- Oman
  SELECT id INTO oman_id FROM regions WHERE name_ar = 'عمان' AND type = 'country' LIMIT 1;
  IF oman_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('عمان', 'country', NULL, true) RETURNING id INTO oman_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT name, 'city', oman_id, true FROM (VALUES ('مسقط'), ('صلالة'), ('صحار')) AS t(name) WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = t.name AND parent_id = oman_id);

  -- Bahrain
  SELECT id INTO bahrain_id FROM regions WHERE name_ar = 'البحرين' AND type = 'country' LIMIT 1;
  IF bahrain_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('البحرين', 'country', NULL, true) RETURNING id INTO bahrain_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT 'المنامة', 'city', bahrain_id, true WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = 'المنامة' AND parent_id = bahrain_id);

  -- Jordan
  SELECT id INTO jordan_id FROM regions WHERE name_ar = 'الأردن' AND type = 'country' LIMIT 1;
  IF jordan_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('الأردن', 'country', NULL, true) RETURNING id INTO jordan_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT name, 'city', jordan_id, true FROM (VALUES ('عمّان'), ('إربد'), ('العقبة')) AS t(name) WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = t.name AND parent_id = jordan_id);

  -- Egypt
  SELECT id INTO egypt_id FROM regions WHERE name_ar = 'مصر' AND type = 'country' LIMIT 1;
  IF egypt_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('مصر', 'country', NULL, true) RETURNING id INTO egypt_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT name, 'city', egypt_id, true FROM (VALUES ('القاهرة'), ('الإسكندرية'), ('شرم الشيخ')) AS t(name) WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = t.name AND parent_id = egypt_id);

  -- Turkey
  SELECT id INTO turkey_id FROM regions WHERE name_ar = 'تركيا' AND type = 'country' LIMIT 1;
  IF turkey_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('تركيا', 'country', NULL, true) RETURNING id INTO turkey_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT name, 'city', turkey_id, true FROM (VALUES ('إسطنبول'), ('أنقرة'), ('طرابزون')) AS t(name) WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = t.name AND parent_id = turkey_id);

  -- Malaysia
  SELECT id INTO malaysia_id FROM regions WHERE name_ar = 'ماليزيا' AND type = 'country' LIMIT 1;
  IF malaysia_id IS NULL THEN
    INSERT INTO regions (name_ar, type, parent_id, is_active) VALUES ('ماليزيا', 'country', NULL, true) RETURNING id INTO malaysia_id;
  END IF;
  INSERT INTO regions (name_ar, type, parent_id, is_active) SELECT 'كوالالمبور', 'city', malaysia_id, true WHERE NOT EXISTS (SELECT 1 FROM regions WHERE name_ar = 'كوالالمبور' AND parent_id = malaysia_id);

END $$;
