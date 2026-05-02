
CREATE TABLE public.support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_phone TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  admin_reply TEXT,
  replied_by UUID,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_support_message_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'read', 'replied', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be pending, read, replied, or closed.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_support_message_status_trigger
  BEFORE INSERT OR UPDATE ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_support_message_status();

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (even unauthenticated for contact form)
CREATE POLICY "Anyone can create support messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (true);

-- Users can view own messages
CREATE POLICY "Users can view own support messages"
  ON public.support_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage support messages"
  ON public.support_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
