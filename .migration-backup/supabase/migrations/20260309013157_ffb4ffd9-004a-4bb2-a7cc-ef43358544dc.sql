
-- 1. System Event Logs
CREATE TABLE IF NOT EXISTS system_event_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  user_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. System Metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  tags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Error Logs
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  endpoint TEXT,
  user_id UUID,
  request_data JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'error',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Daily Performance Stats
CREATE TABLE IF NOT EXISTS daily_performance_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  total_shipments INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  total_rides INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  platform_commission DECIMAL(12,2) DEFAULT 0,
  avg_response_time DECIMAL(10,2) DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON system_event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_type ON system_event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(is_resolved);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_performance_stats(stat_date DESC);

-- RLS
ALTER TABLE system_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_performance_stats ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins manage system_event_logs" ON system_event_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage system_metrics" ON system_metrics FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage error_logs" ON error_logs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage daily_performance_stats" ON daily_performance_stats FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE system_event_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE error_logs;

-- Service role insert policies (for edge functions)
CREATE POLICY "Service insert system_event_logs" ON system_event_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service insert system_metrics" ON system_metrics FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service insert error_logs" ON error_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service insert daily_performance_stats" ON daily_performance_stats FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service update daily_performance_stats" ON daily_performance_stats FOR UPDATE TO anon USING (true);
