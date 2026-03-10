
-- Allow authenticated users to view partner bank accounts (for payment page)
CREATE POLICY "Authenticated users can view partner bank accounts"
ON public.partner_bank_accounts FOR SELECT
TO authenticated USING (true);

-- Allow customers to update their own bookings (for payment metadata)
CREATE POLICY "Customers can update own bookings"
ON public.bookings FOR UPDATE
TO authenticated USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);
