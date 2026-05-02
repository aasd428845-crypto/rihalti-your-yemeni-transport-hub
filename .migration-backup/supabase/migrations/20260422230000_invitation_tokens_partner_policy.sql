-- Allow delivery companies and suppliers (restaurants/partners) to create
-- invitation tokens for their own drivers/staff, and to view/revoke them.

DROP POLICY IF EXISTS "Companies can create their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can create their invitations"
  ON public.invitation_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'delivery_company'::public.app_role)
      OR public.has_role(auth.uid(), 'supplier'::public.app_role)
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Companies can view their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can view their invitations"
  ON public.invitation_tokens
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Companies can update their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can update their invitations"
  ON public.invitation_tokens
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Companies can delete their invitations" ON public.invitation_tokens;
CREATE POLICY "Companies can delete their invitations"
  ON public.invitation_tokens
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
