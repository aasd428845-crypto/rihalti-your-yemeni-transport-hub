
-- 1. جدول تصنيفات الخدمات الرئيسية (مطاعم، بقالة، صيدلية)
CREATE TABLE IF NOT EXISTS public.service_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول تصنيفات المطاعم (يمني، برجر، بيتزا، إلخ)
CREATE TABLE IF NOT EXISTS public.restaurant_cuisines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- تمكين RLS
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_cuisines ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Anyone can view active service types" ON public.service_types FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage service types" ON public.service_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active restaurant cuisines" ON public.restaurant_cuisines FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage restaurant cuisines" ON public.restaurant_cuisines FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- إدراج بيانات أولية للخدمات الرئيسية
INSERT INTO public.service_types (name_ar, image_url, sort_order) VALUES
('مطاعم', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80&fit=crop', 1),
('بقالة', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&fit=crop', 2),
('صيدلية', 'https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?w=600&q=80&fit=crop', 3)
ON CONFLICT DO NOTHING;

-- إدراج بيانات أولية لتصنيفات المطاعم
INSERT INTO public.restaurant_cuisines (name_ar, image_url, sort_order) VALUES
('يمني', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&fit=crop', 1),
('برجر', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop', 2),
('بيتزا', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&fit=crop', 3),
('مأكولات بحرية', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&fit=crop', 4),
('حلويات', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80&fit=crop', 5),
('مشروبات', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80&fit=crop', 6),
('شاورما', 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=600&q=80&fit=crop', 7),
('مرق', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80&fit=crop', 8)
ON CONFLICT DO NOTHING;
