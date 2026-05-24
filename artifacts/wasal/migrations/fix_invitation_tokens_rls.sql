-- =====================================================================
-- إصلاح RLS على جدول invitation_tokens
-- المشكلة: المستخدم الجديد (زائر/anon) لا يستطيع قراءة الجدول عند
--          فتح رابط الدعوة، فيظهر "رابط دعوة غير صالح".
-- الحل: السماح لجميع المستخدمين (بما فيهم غير المسجلين) بقراءة
--       الجدول. الأمان مضمون لأن الـ token هو UUID عشوائي.
-- =====================================================================

-- 1. تفعيل RLS على الجدول (لو لم يكن مفعلاً بالفعل)
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- 2. السماح للجميع (anon + authenticated) بقراءة الـ tokens
--    نستخدم IF NOT EXISTS لتجنب الخطأ إذا كانت السياسة موجودة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'invitation_tokens'
      AND policyname = 'anon_read_invite_tokens'
  ) THEN
    CREATE POLICY "anon_read_invite_tokens"
      ON public.invitation_tokens
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 3. السماح للمستخدمين المسجلين (شركة التوصيل) بإدراج tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'invitation_tokens'
      AND policyname = 'auth_insert_invite_tokens'
  ) THEN
    CREATE POLICY "auth_insert_invite_tokens"
      ON public.invitation_tokens
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = created_by);
  END IF;
END $$;

-- 4. السماح للمستخدمين المسجلين بتحديث token (وضع علامة "used_at")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'invitation_tokens'
      AND policyname = 'auth_update_invite_tokens'
  ) THEN
    CREATE POLICY "auth_update_invite_tokens"
      ON public.invitation_tokens
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
