
-- 1. Alert Rules table
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'error_rate',
  condition JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'warning',
  notification_channels TEXT[] DEFAULT ARRAY['dashboard'],
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Alert History table
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  metric_value NUMERIC(10,2),
  message TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- 3. RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage alert_rules" ON public.alert_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage alert_history" ON public.alert_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service insert alert_history" ON public.alert_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Enable realtime for alert_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_history;

-- 5. Indexes
CREATE INDEX idx_alert_history_triggered ON public.alert_history(triggered_at DESC);
CREATE INDEX idx_alert_rules_active ON public.alert_rules(is_active) WHERE is_active = true;
