
-- Fix the overly permissive insert policy on financial_transactions
DROP POLICY IF EXISTS "Authenticated insert financial_transactions" ON public.financial_transactions;
CREATE POLICY "Authenticated insert own financial_transactions" ON public.financial_transactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id OR auth.uid() = partner_id);
