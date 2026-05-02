-- Create custom_regions table for user-submitted regions
CREATE TABLE public.custom_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  parent_region_id integer REFERENCES public.regions(id),
  submitted_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.custom_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert custom regions"
  ON public.custom_regions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view own and approved custom regions"
  ON public.custom_regions FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR status = 'approved');

CREATE POLICY "Admins can update custom regions"
  ON public.custom_regions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));