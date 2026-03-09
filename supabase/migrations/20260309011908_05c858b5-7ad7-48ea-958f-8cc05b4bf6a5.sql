
-- Add period_type and pdf_url to partner_invoices
ALTER TABLE public.partner_invoices ADD COLUMN IF NOT EXISTS period_type text;
ALTER TABLE public.partner_invoices ADD COLUMN IF NOT EXISTS pdf_url text;

-- Add trial fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start_date timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_end_date timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_trial_active boolean DEFAULT false;
