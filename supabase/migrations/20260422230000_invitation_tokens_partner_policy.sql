-- Allow delivery companies and partners (restaurants) to create invitation tokens
-- for their own drivers/staff, and to view/revoke the ones they created.

-- INSERT: any authenticated delivery company or partner can create a token,
-- as long as created_by matches their own auth uid.
DROP POLICY IF EXISTS "Companies can create their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can create their invitations"
  ON public.invitation_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'delivery_company')
      OR public.has_role(auth.uid(), 'partner')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- SELECT: companies/partners can read invitations they created
DROP POLICY IF EXISTS "Companies can view their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can view their invitations"
  ON public.invitation_tokens
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- UPDATE/DELETE: companies/partners can revoke their own invitations
DROP POLICY IF EXISTS "Companies can update their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can update their invitations"
  ON public.invitation_tokens
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Companies can delete their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can delete their invitations"
  ON public.invitation_tokens
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
