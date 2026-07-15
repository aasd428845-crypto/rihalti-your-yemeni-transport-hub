-- ============================================================
-- Migration 032: app_settings table + delivery_company RLS for support chat
-- ============================================================

-- 1. Create app_settings table if not exists (for WhatsApp support number & other app config)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Grant basic access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated;

-- Policy: any authenticated user can read all app_settings (needed for WhatsApp number display)
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
CREATE POLICY "Authenticated users can read app_settings"
  ON public.app_settings FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policy: delivery_company and admin roles can upsert app_settings (for WhatsApp config)
DROP POLICY IF EXISTS "Staff can manage app_settings" ON public.app_settings;
CREATE POLICY "Staff can manage app_settings"
  ON public.app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'delivery_company')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'delivery_company')
    )
  );

-- 2. Ensure conversations RLS allows delivery_company to read support conversations
--    (the table likely already exists; this adds the policy if missing)

ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;

-- Policy: delivery_company can read all support conversations
DROP POLICY IF EXISTS "Delivery companies can view support conversations" ON public.conversations;
CREATE POLICY "Delivery companies can view support conversations"
  ON public.conversations FOR SELECT
  USING (
    subject = 'support'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'delivery_company'
    )
  );

-- Policy: delivery_company can update conversation timestamps
DROP POLICY IF EXISTS "Delivery companies can update support conversations" ON public.conversations;
CREATE POLICY "Delivery companies can update support conversations"
  ON public.conversations FOR UPDATE
  USING (
    subject = 'support'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'delivery_company'
    )
  )
  WITH CHECK (
    subject = 'support'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'delivery_company'
    )
  );

-- 3. Ensure messages RLS allows delivery_company to read/insert messages

ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: delivery_company can read all messages in support conversations
DROP POLICY IF EXISTS "Delivery companies can view support messages" ON public.messages;
CREATE POLICY "Delivery companies can view support messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.subject = 'support'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'delivery_company'
    )
  );

-- Policy: delivery_company can insert replies to support conversations
DROP POLICY IF EXISTS "Delivery companies can reply to support conversations" ON public.messages;
CREATE POLICY "Delivery companies can reply to support conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.subject = 'support'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'delivery_company'
    )
  );

-- Policy: delivery_company can update their own messages (e.g. edit/delete)
DROP POLICY IF EXISTS "Delivery companies can update own support messages" ON public.messages;
CREATE POLICY "Delivery companies can update own support messages"
  ON public.messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'delivery_company'
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'delivery_company'
    )
  );
