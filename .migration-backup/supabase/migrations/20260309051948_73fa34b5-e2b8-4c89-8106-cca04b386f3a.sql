
-- Create violation_logs table
CREATE TABLE IF NOT EXISTS public.violation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  violation_type TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  related_entity_id TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.violation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage violations"
  ON public.violation_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create system_event_logs table for monitoring
CREATE TABLE IF NOT EXISTS public.system_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  user_id UUID,
  metadata JSONB,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system events"
  ON public.system_event_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create system_metrics table for monitoring
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system metrics"
  ON public.system_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
