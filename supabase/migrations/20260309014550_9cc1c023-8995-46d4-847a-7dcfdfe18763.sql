
-- Generated reports table
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL DEFAULT 'daily',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  summary JSONB DEFAULT '{}',
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  generated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage generated_reports" ON public.generated_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_generated_reports_type_date ON public.generated_reports(report_type, period_end DESC);

-- Storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins access reports bucket" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'reports' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'reports' AND public.has_role(auth.uid(), 'admin'));
