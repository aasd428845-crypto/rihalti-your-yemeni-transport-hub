-- ============================================================
-- وصل (Wasal) — إصلاح صلاحيات مندوبي التوصيل في Supabase
-- شغّل هذا الكود كاملاً في SQL Editor في Supabase Dashboard
-- ============================================================


-- ════════════════════════════════════════════════════
-- 1. جدول riders — قراءة وتحديث بيانات المندوب نفسه
-- ════════════════════════════════════════════════════

DROP POLICY IF EXISTS "riders_read_own_profile"   ON public.riders;
DROP POLICY IF EXISTS "riders_update_own_profile" ON public.riders;

CREATE POLICY "riders_read_own_profile"
ON public.riders FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "riders_update_own_profile"
ON public.riders FOR UPDATE
TO authenticated
USING    (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ════════════════════════════════════════════════════
-- 2. جدول delivery_orders — قراءة طلبات المندوب
--    (الطلبات المعيّنة له حيث rider_id = id المندوب)
-- ════════════════════════════════════════════════════

DROP POLICY IF EXISTS "riders_read_assigned_orders"       ON public.delivery_orders;
DROP POLICY IF EXISTS "riders_read_company_pending_orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "riders_update_assigned_orders"     ON public.delivery_orders;

-- قراءة الطلبات المعيّنة للمندوب
CREATE POLICY "riders_read_assigned_orders"
ON public.delivery_orders FOR SELECT
TO authenticated
USING (
  rider_id IN (
    SELECT id FROM public.riders WHERE user_id = auth.uid()
  )
);

-- قراءة الطلبات المعلقة لشركة المندوب (لقسم "طلبات متاحة")
CREATE POLICY "riders_read_company_pending_orders"
ON public.delivery_orders FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND rider_id IS NULL
  AND delivery_company_id IN (
    SELECT delivery_company_id FROM public.riders WHERE user_id = auth.uid()
  )
);

-- تحديث حالة الطلب (picked_up / on_the_way / delivered)
CREATE POLICY "riders_update_assigned_orders"
ON public.delivery_orders FOR UPDATE
TO authenticated
USING (
  rider_id IN (
    SELECT id FROM public.riders WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  rider_id IN (
    SELECT id FROM public.riders WHERE user_id = auth.uid()
  )
);


-- ════════════════════════════════════════════════════
-- 3. جدول order_tracking — قراءة وإدراج سجلات التتبع
-- ════════════════════════════════════════════════════

DROP POLICY IF EXISTS "riders_read_own_tracking"   ON public.order_tracking;
DROP POLICY IF EXISTS "riders_insert_own_tracking" ON public.order_tracking;

CREATE POLICY "riders_read_own_tracking"
ON public.order_tracking FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.delivery_orders
    WHERE rider_id IN (
      SELECT id FROM public.riders WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "riders_insert_own_tracking"
ON public.order_tracking FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT id FROM public.delivery_orders
    WHERE rider_id IN (
      SELECT id FROM public.riders WHERE user_id = auth.uid()
    )
  )
);


-- ════════════════════════════════════════════════════
-- 4. جدول rider_cash_collections — قراءة التحصيلات النقدية
-- ════════════════════════════════════════════════════

DROP POLICY IF EXISTS "riders_read_own_cash_collections" ON public.rider_cash_collections;

CREATE POLICY "riders_read_own_cash_collections"
ON public.rider_cash_collections FOR SELECT
TO authenticated
USING (
  rider_id IN (
    SELECT id FROM public.riders WHERE user_id = auth.uid()
  )
);


-- ════════════════════════════════════════════════════
-- 5. جدول notifications — قراءة وتحديث الإشعارات
-- ════════════════════════════════════════════════════

DROP POLICY IF EXISTS "users_read_own_notifications"   ON public.notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;

CREATE POLICY "users_read_own_notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING    (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ════════════════════════════════════════════════════
-- 6. جدول restaurants — قراءة بيانات المطاعم
--    (مطلوب لعرض اسم المطعم في بطاقة الطلب)
-- ════════════════════════════════════════════════════

DROP POLICY IF EXISTS "riders_read_restaurants" ON public.restaurants;

CREATE POLICY "riders_read_restaurants"
ON public.restaurants FOR SELECT
TO authenticated
USING (true);


-- ════════════════════════════════════════════════════
-- 7. التحقق من وجود الأعمدة المطلوبة في delivery_orders
--    (أضفها إذا كانت غائبة — آمن إذا كانت موجودة)
-- ════════════════════════════════════════════════════

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS rider_id    UUID REFERENCES public.riders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- فهرس لتسريع الاستعلامات على rider_id
CREATE INDEX IF NOT EXISTS idx_delivery_orders_rider_id
  ON public.delivery_orders (rider_id);

-- فهرس لتسريع الاستعلامات على delivery_company_id + status
CREATE INDEX IF NOT EXISTS idx_delivery_orders_company_status
  ON public.delivery_orders (delivery_company_id, status);


-- ════════════════════════════════════════════════════
-- انتهى — يمكنك الآن إعادة تحميل تطبيق المندوب
-- ════════════════════════════════════════════════════
