-- ============================================================
-- وصال – Migration 010: Missing Offers Schema
-- ============================================================
-- ما يُصلحه هذا الملف:
--   1. restaurant_promotions   — أعمدة sponsor_type / sponsor_name
--   2. delivery_company_offers — أعمدة sponsor_type / sponsor_name / source_promo_id
--                                 + توسيع قيد offer_type ليشمل percent_off_order وغيره
--   3. delivery_banners        — جدول جديد كامل (البانرات في الواجهة الرئيسية)
--   4. verification_codes      — جدول رموز SMS (مستخدم في الـ backend API)
--
-- طريقة التشغيل: Supabase Dashboard → SQL Editor → New Query → Run
-- آمن للتشغيل أكثر من مرة (IF NOT EXISTS / IF EXISTS في كل خطوة)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. restaurant_promotions — إضافة أعمدة الراعي
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.restaurant_promotions
  ADD COLUMN IF NOT EXISTS sponsor_type text
    CHECK (sponsor_type IN ('restaurant', 'external', 'platform')),
  ADD COLUMN IF NOT EXISTS sponsor_name text;


-- ─────────────────────────────────────────────────────────────
-- 2. delivery_company_offers — أعمدة ناقصة + تصحيح قيد offer_type
-- ─────────────────────────────────────────────────────────────

-- 2a. أعمدة الراعي + الربط بالعرض الأصلي
ALTER TABLE public.delivery_company_offers
  ADD COLUMN IF NOT EXISTS sponsor_type    text
    CHECK (sponsor_type IN ('restaurant', 'external', 'platform')),
  ADD COLUMN IF NOT EXISTS sponsor_name    text,
  ADD COLUMN IF NOT EXISTS source_promo_id uuid
    REFERENCES public.restaurant_promotions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS delivery_company_offers_source_promo_idx
  ON public.delivery_company_offers(source_promo_id);

-- 2b. توسيع قيد offer_type ليشمل أنواع الخصم على الطلب والكومبو
--     (الـ constraint القديم يرفض percent_off_order و fixed_off_order)
DO $$
BEGIN
  -- احذف القيد القديم إن وُجد (يمكن أن يكون باسم مختلف)
  ALTER TABLE public.delivery_company_offers
    DROP CONSTRAINT IF EXISTS delivery_company_offers_offer_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL; -- تجاهل إذا لم يكن موجوداً
END $$;

ALTER TABLE public.delivery_company_offers
  ADD CONSTRAINT delivery_company_offers_offer_type_check
  CHECK (offer_type IN (
    'free_delivery',
    'percent_off_delivery',
    'fixed_off_delivery',
    'percent_off_order',
    'fixed_off_order',
    'buy_x_get_y',
    'custom'
  ));


-- ─────────────────────────────────────────────────────────────
-- 3. delivery_banners — جدول البانرات في الواجهة الرئيسية للعملاء
--    يُكتب عليه تلقائياً من صفحة "عروض المطاعم" عند حفظ أي عرض
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_banners (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_company_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               text        NOT NULL,
  subtitle            text,
  image_url           text,
  badge_text          text,
  is_active           boolean     NOT NULL DEFAULT true,
  banner_type         text        NOT NULL DEFAULT 'offer',
  tile_action         text,
  link_url            text,
  city                text,
  sort_order          integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_banners_company
  ON public.delivery_banners(delivery_company_id);

CREATE INDEX IF NOT EXISTS idx_delivery_banners_active
  ON public.delivery_banners(is_active)
  WHERE is_active = true;

ALTER TABLE public.delivery_banners ENABLE ROW LEVEL SECURITY;

-- العملاء والزوار يقرؤون البانرات النشطة
DROP POLICY IF EXISTS "anyone_can_read_delivery_banners" ON public.delivery_banners;
CREATE POLICY "anyone_can_read_delivery_banners"
  ON public.delivery_banners FOR SELECT USING (true);

-- شركة التوصيل تدير بانراتها فقط
DROP POLICY IF EXISTS "company_manages_own_banners" ON public.delivery_banners;
CREATE POLICY "company_manages_own_banners"
  ON public.delivery_banners FOR ALL
  USING  (delivery_company_id = auth.uid())
  WITH CHECK (delivery_company_id = auth.uid());

-- المديرون يديرون جميع البانرات
DROP POLICY IF EXISTS "admins_manage_all_banners" ON public.delivery_banners;
CREATE POLICY "admins_manage_all_banners"
  ON public.delivery_banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

GRANT SELECT ON public.delivery_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_banners TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 4. verification_codes — رموز التحقق عبر SMS
--    مستخدم في backend API (/api/sms/send و /api/sms/verify)
--    جميع العمليات تتم عبر service role key (يتجاوز RLS)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text        NOT NULL,
  code       text        NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone)
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_phone
  ON public.verification_codes(phone);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- لا صلاحيات لـ anon أو authenticated — الوصول فقط عبر service role في الـ backend
-- (الـ backend يستخدم SUPABASE_SERVICE_ROLE_KEY الذي يتجاوز RLS تلقائياً)


-- ─────────────────────────────────────────────────────────────
-- تحديث cache الـ PostgREST
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- انتهى ✓
-- ============================================================
