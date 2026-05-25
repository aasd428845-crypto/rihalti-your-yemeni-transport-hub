-- ============================================================
-- وصل - تحديثات قاعدة البيانات
-- يشمل: جدول المندوبين، النقد، الدعوات، تتبع المواقع
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. جدول riders (مندوبو شركات التوصيل)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS riders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_company_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- بيانات شخصية
  full_name            TEXT NOT NULL DEFAULT '',
  phone                TEXT NOT NULL DEFAULT '',
  email                TEXT,
  id_number            TEXT,

  -- بيانات المركبة
  vehicle_type         TEXT DEFAULT 'motorcycle',  -- motorcycle | bicycle | car | foot
  vehicle_plate        TEXT,
  vehicle_color        TEXT,
  vehicle_image        TEXT,

  -- حالة المندوب
  is_active            BOOLEAN NOT NULL DEFAULT true,
  is_approved          BOOLEAN NOT NULL DEFAULT false,
  is_online            BOOLEAN NOT NULL DEFAULT false,

  -- إحصائيات
  total_deliveries     INTEGER NOT NULL DEFAULT 0,
  earnings             NUMERIC(12,2) NOT NULL DEFAULT 0,
  rating               NUMERIC(3,2) NOT NULL DEFAULT 0,

  -- عمولة
  commission_type      TEXT DEFAULT 'percentage',  -- percentage | fixed
  commission_value     NUMERIC(10,2) DEFAULT 10,

  -- موقع GPS (اختياري)
  current_lat          NUMERIC(10,7),
  current_lng          NUMERIC(10,7),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إضافة الأعمدة الناقصة إذا كان الجدول موجوداً مسبقاً
ALTER TABLE riders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS vehicle_image TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage';
ALTER TABLE riders ADD COLUMN IF NOT EXISTS commission_value NUMERIC(10,2) DEFAULT 10;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS current_lat NUMERIC(10,7);
ALTER TABLE riders ADD COLUMN IF NOT EXISTS current_lng NUMERIC(10,7);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_riders_delivery_company ON riders(delivery_company_id);
CREATE INDEX IF NOT EXISTS idx_riders_user_id ON riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_is_online ON riders(is_online) WHERE is_online = true;


-- ──────────────────────────────────────────────────────────
-- 2. جدول rider_cash_collections (تتبع النقد عند الاستلام)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rider_cash_collections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id             UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  delivery_company_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  order_id             UUID REFERENCES delivery_orders(id) ON DELETE SET NULL,

  amount               NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- pending_pickup: المبلغ مع المندوب (لم يستلمه العميل بعد)
  -- collected:      المندوب استلم النقد من العميل، لكن لم يسلّمه للشركة
  -- settled:        سلّم المندوب المبلغ للشركة
  -- cancelled:      ملغي (مثلاً إلغاء الطلب أو إعادة التعيين)
  status               TEXT NOT NULL DEFAULT 'pending_pickup'
                         CHECK (status IN ('pending_pickup', 'collected', 'settled', 'cancelled')),

  collected_at         TIMESTAMPTZ,
  settled_at           TIMESTAMPTZ,
  settled_by           UUID REFERENCES auth.users(id),
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_rider ON rider_cash_collections(rider_id);
CREATE INDEX IF NOT EXISTS idx_cash_order ON rider_cash_collections(order_id);
CREATE INDEX IF NOT EXISTS idx_cash_status ON rider_cash_collections(status);
CREATE INDEX IF NOT EXISTS idx_cash_company ON rider_cash_collections(delivery_company_id);


-- ──────────────────────────────────────────────────────────
-- 3. جدول invitation_tokens (روابط الدعوة للمندوبين والشركاء)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL,           -- delivery_driver | driver | supplier | delivery_company
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_email ON invitation_tokens(email);
CREATE INDEX IF NOT EXISTS idx_invite_created_by ON invitation_tokens(created_by);


-- ──────────────────────────────────────────────────────────
-- 4. جدول delivery_orders (الطلبات) - أعمدة إضافية
-- ──────────────────────────────────────────────────────────
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivery_fee  NUMERIC(10,2) DEFAULT 0;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS rider_id      UUID REFERENCES riders(id) ON DELETE SET NULL;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS assigned_at   TIMESTAMPTZ;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS picked_up_at  TIMESTAMPTZ;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_rider ON delivery_orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON delivery_orders(delivery_company_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON delivery_orders(created_at DESC);


-- ──────────────────────────────────────────────────────────
-- 5. جدول order_tracking (سجل تتبع الطلبات)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tracking (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_order ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_created ON order_tracking(created_at DESC);


-- ──────────────────────────────────────────────────────────
-- 6. جدول rider_rewards (مكافآت المندوبين)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rider_rewards (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_company_id  UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  rider_id             UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
  amount               NUMERIC(10,2) NOT NULL DEFAULT 0,
  type                 TEXT DEFAULT 'bonus',      -- bonus | penalty | adjustment
  description          TEXT,
  achieved_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_rider ON rider_rewards(rider_id);
CREATE INDEX IF NOT EXISTS idx_rewards_company ON rider_rewards(delivery_company_id);


-- ──────────────────────────────────────────────────────────
-- 7. Row Level Security (RLS) - صلاحيات الوصول
-- ──────────────────────────────────────────────────────────

-- تفعيل RLS على الجداول الحساسة
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_cash_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_rewards ENABLE ROW LEVEL SECURITY;

-- سياسات riders:
-- شركة التوصيل ترى مندوبيها فقط
DROP POLICY IF EXISTS "delivery_company_sees_own_riders" ON riders;
CREATE POLICY "delivery_company_sees_own_riders" ON riders
  FOR ALL USING (
    delivery_company_id = auth.uid()
    OR user_id = auth.uid()
  );

-- سياسات rider_cash_collections:
DROP POLICY IF EXISTS "company_sees_own_collections" ON rider_cash_collections;
CREATE POLICY "company_sees_own_collections" ON rider_cash_collections
  FOR ALL USING (
    delivery_company_id = auth.uid()
    OR rider_id IN (SELECT id FROM riders WHERE user_id = auth.uid())
  );

-- سياسات invitation_tokens:
DROP POLICY IF EXISTS "creator_sees_own_tokens" ON invitation_tokens;
CREATE POLICY "creator_sees_own_tokens" ON invitation_tokens
  FOR SELECT USING (
    created_by = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "authenticated_can_insert_tokens" ON invitation_tokens;
CREATE POLICY "authenticated_can_insert_tokens" ON invitation_tokens
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "anon_can_read_valid_token" ON invitation_tokens;
CREATE POLICY "anon_can_read_valid_token" ON invitation_tokens
  FOR SELECT USING (
    used_at IS NULL AND expires_at > now()
  );


-- ──────────────────────────────────────────────────────────
-- 8. Storage buckets للصور (تنفيذ في Supabase Dashboard)
-- ──────────────────────────────────────────────────────────
-- قم بإنشاء هذه الـ Buckets من لوحة تحكم Supabase > Storage:
--
-- • company-logos    (public: true)
-- • id-images        (public: false)  ← وثائق الهوية (خاصة)
-- • selfie-images    (public: false)
-- • license-images   (public: false)
-- • vehicle-images   (public: true)
-- • rider-documents  (public: false)


-- ──────────────────────────────────────────────────────────
-- 9. دالة تحديث updated_at تلقائياً
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الدالة على الجداول
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['riders', 'rider_cash_collections'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || tbl || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;


-- ──────────────────────────────────────────────────────────
-- 10. دالة إحصائيات المندوب (اختياري - يمكن الاستغناء عنها
--     لأن التطبيق يحسبها في الواجهة الأمامية)
-- ──────────────────────────────────────────────────────────
-- استعلام مفيد لمعرفة إحصائيات مندوب معين:
/*
SELECT
  r.full_name,
  r.phone,
  r.vehicle_type,
  r.created_at AS joined_at,
  COUNT(o.id) FILTER (WHERE o.status = 'delivered') AS delivered_orders,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'delivered'), 0) AS total_delivery_fees,
  COALESCE(SUM(rcc.amount) FILTER (WHERE rcc.status IN ('pending_pickup','collected')), 0) AS pending_cash,
  COALESCE(SUM(rcc.amount) FILTER (WHERE rcc.status = 'settled'), 0) AS settled_cash
FROM riders r
LEFT JOIN delivery_orders o ON o.rider_id = r.id
LEFT JOIN rider_cash_collections rcc ON rcc.rider_id = r.id
WHERE r.id = '<rider-id>'
GROUP BY r.id, r.full_name, r.phone, r.vehicle_type, r.created_at;
*/
