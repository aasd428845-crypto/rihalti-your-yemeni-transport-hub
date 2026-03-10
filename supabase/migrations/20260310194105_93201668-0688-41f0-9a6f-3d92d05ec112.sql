-- Allow authenticated users to see supplier and delivery_company roles (needed for listing partners)
CREATE POLICY "Authenticated can view partner roles"
ON public.user_roles FOR SELECT
TO authenticated USING (
  role IN ('supplier'::app_role, 'delivery_company'::app_role)
);