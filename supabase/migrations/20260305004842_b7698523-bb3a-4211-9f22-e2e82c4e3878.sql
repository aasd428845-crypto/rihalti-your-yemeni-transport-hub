
-- Fix overly permissive INSERT policy on notification_logs
DROP POLICY IF EXISTS "System can insert notification logs" ON notification_logs;

-- Allow authenticated users to insert their own notification logs
CREATE POLICY "Authenticated can insert own notification logs" ON notification_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
