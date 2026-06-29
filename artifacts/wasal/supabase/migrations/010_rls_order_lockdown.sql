-- ============================================================
-- Security: Lock down order creation + financial_transactions
-- Run in Supabase SQL Editor AFTER confirming the new
-- /api/orders/create endpoint works end-to-end.
-- ============================================================

-- 1. Remove the wide-open "anyone can insert orders" policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.delivery_orders;

-- 2. Replace with: only authenticated users inserting their OWN customer_id.
--    The /api/orders/create endpoint uses the service role key, which bypasses
--    RLS entirely, so this only blocks rogue direct-client inserts.
CREATE POLICY "Customers create own orders only" ON public.delivery_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- 3. Remove the policy that allows any user to insert fake financial records.
DROP POLICY IF EXISTS "Authenticated insert own financial_transactions" ON public.financial_transactions;

-- financial_transactions is now written ONLY by server code using the service role key,
-- which bypasses RLS by design. No authenticated/anon role needs direct INSERT access.
