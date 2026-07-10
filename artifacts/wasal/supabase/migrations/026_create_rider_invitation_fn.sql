-- Function: public.create_rider_invitation
-- Atomically creates an invitation_token + riders placeholder row in one
-- transaction.  SECURITY DEFINER bypasses RLS so it works whether the caller
-- is the delivery-company owner or any authenticated user.
--
-- Re-invite logic: if a non-approved placeholder already exists for the same
-- (email, company), we reuse that row and simply issue a new token — no
-- duplicate rider rows.
--
-- Returns: the new token UUID as text (caller builds the invite URL).

CREATE OR REPLACE FUNCTION public.create_rider_invitation(
  p_email      text,
  p_company_id uuid,
  p_created_by uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token    text;
  v_expires  timestamptz;
  v_rider_id uuid;
BEGIN
  -- Generate token and expiry
  v_token   := gen_random_uuid()::text;
  v_expires := now() + interval '7 days';

  -- ── 1. Look for an existing un-activated placeholder ──────────────────────
  SELECT id INTO v_rider_id
  FROM public.riders
  WHERE email                ILIKE p_email
    AND delivery_company_id  = p_company_id
    AND (is_approved IS FALSE OR is_approved IS NULL)
    AND user_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- ── 2. Create placeholder only when none exists ───────────────────────────
  IF v_rider_id IS NULL THEN
    INSERT INTO public.riders (
      delivery_company_id,
      email,
      full_name,
      phone,
      is_active,
      is_approved
    ) VALUES (
      p_company_id,
      lower(trim(p_email)),
      split_part(p_email, '@', 1),  -- temporary name until the rider fills in their profile
      '',
      false,
      false
    )
    RETURNING id INTO v_rider_id;
  END IF;

  -- ── 3. Always create a fresh invitation token ─────────────────────────────
  INSERT INTO public.invitation_tokens (
    email,
    role,
    token,
    created_by,
    expires_at
  ) VALUES (
    lower(trim(p_email)),
    'delivery_driver',
    v_token,
    p_created_by,
    v_expires
  );

  RETURN v_token;
END;
$$;

-- Grant execute to authenticated users (delivery-company owners call this from client)
GRANT EXECUTE ON FUNCTION public.create_rider_invitation(text, uuid, uuid)
  TO authenticated;
