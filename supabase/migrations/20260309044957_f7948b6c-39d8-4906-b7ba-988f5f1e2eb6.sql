CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Only admins can view" ON public.newsletter_subscribers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));