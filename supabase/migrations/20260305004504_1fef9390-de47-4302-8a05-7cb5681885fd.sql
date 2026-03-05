
-- Add onesignal_player_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;

-- Notification settings per user
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enable_push_notifications BOOLEAN DEFAULT true,
  enable_sound BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  notify_trip_reminders BOOLEAN DEFAULT true,
  notify_shipment_updates BOOLEAN DEFAULT true,
  notify_delivery_updates BOOLEAN DEFAULT true,
  notify_ride_requests BOOLEAN DEFAULT true,
  notify_promotions BOOLEAN DEFAULT true,
  notify_payments BOOLEAN DEFAULT true,
  notification_sound TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT,
  sound TEXT,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'::jsonb
);

-- Bulk notifications
CREATE TABLE IF NOT EXISTS bulk_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID,
  target_role TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sound TEXT DEFAULT 'default',
  image_url TEXT,
  action_url TEXT,
  status TEXT DEFAULT 'pending',
  sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_notifications ENABLE ROW LEVEL SECURITY;

-- notification_settings policies
CREATE POLICY "Users can manage own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notification settings" ON notification_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- notification_logs policies
CREATE POLICY "Users can view own notification logs" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification logs" ON notification_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notification logs" ON notification_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notification logs" ON notification_logs
  FOR INSERT WITH CHECK (true);

-- bulk_notifications policies
CREATE POLICY "Admins can manage bulk notifications" ON bulk_notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Suppliers can create bulk notifications" ON bulk_notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'supplier'::app_role));

CREATE POLICY "Suppliers can view own bulk notifications" ON bulk_notifications
  FOR SELECT USING (auth.uid() = created_by);
