-- Link rider rows to a Supabase auth user once the driver completes
-- the invitation signup, and track approval state separately from is_active.
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_riders_user_id ON public.riders(user_id);
CREATE INDEX IF NOT EXISTS idx_riders_company_email ON public.riders(delivery_company_id, email);

-- Allow drivers to read their own rider row (after they link via invite)
DROP POLICY IF EXISTS "Drivers can view own rider row" ON public.riders;
CREATE POLICY "Drivers can view own rider row"
  ON public.riders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow drivers to update their own online/location fields
DROP POLICY IF EXISTS "Drivers can update own rider row" ON public.riders;
CREATE POLICY "Drivers can update own rider row"
  ON public.riders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
