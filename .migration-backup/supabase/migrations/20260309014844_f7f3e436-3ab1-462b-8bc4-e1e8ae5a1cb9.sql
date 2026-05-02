
-- Auto-healing logs table
CREATE TABLE IF NOT EXISTS public.auto_healing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.auto_healing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage auto_healing_logs" ON public.auto_healing_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service insert auto_healing_logs" ON public.auto_healing_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_auto_healing_logs_created ON public.auto_healing_logs(created_at DESC);
