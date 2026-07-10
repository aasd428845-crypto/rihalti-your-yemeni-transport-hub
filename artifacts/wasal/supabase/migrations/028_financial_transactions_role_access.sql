-- ============================================================
-- Fix: financial_transactions has almost no read access and no safe
-- write path, breaking customer/admin/rider pages and accountingApi.ts.
-- ============================================================
-- NOTE ON FILE NUMBERING: requested as `027_financial_transactions_role_access.sql`,
-- but `027_partner_settings_and_earnings_access.sql` was already created earlier
-- this session. Filed as `028_...` instead to avoid overwriting it. `020` and
-- `021` were NOT touched, per instructions.
--
-- ============================================================
-- SCHEMA FACTS (confirmed live via PostgREST column probing with the anon
-- key + src/integrations/supabase/types.ts; anon gets 401 = column exists
-- but RLS-blocked, 400 = column does not exist):
--
-- financial_transactions (Row) — confirmed EXISTING columns:
--   id, transaction_type, reference_id, customer_id, partner_id, amount,
--   platform_commission, partner_earning, payment_method, payment_status,
--   due_date, metadata, payment_transaction_id, paid_at, created_at
--   -> Confirmed NOT existing: user_id, entity_type, related_entity_id, status
--      (those live on payment_transactions instead, used by migration 021's
--      approve/reject functions — a different table).
--   -> The customer-linking column is `customer_id`, NOT `user_id`.
--   -> `reference_id` points at whichever entity `transaction_type` names
--      (a delivery_orders.id when transaction_type = 'delivery', a
--      bookings.id when transaction_type = 'booking', etc).
--
-- delivery_orders.rider_id -> FK to riders.id (confirmed via
-- types.ts "delivery_orders_rider_id_fkey" -> referencedRelation: "riders"),
-- NOT auth.uid() directly. A rider authenticates as riders.user_id = auth.uid().
-- So "rider owns this transaction" must resolve through BOTH tables:
--   financial_transactions.reference_id = delivery_orders.id
--   AND delivery_orders.rider_id = riders.id
--   AND riders.user_id = auth.uid()
--
-- has_role(uuid, text) already exists (created before this project's
-- migration history, hardened in 002_security_fixes.sql) and is the
-- established admin-check helper used elsewhere — reused here instead of
-- re-deriving via user_roles directly, per the requested approach.
-- ============================================================

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 1. Admin — full read access (AdminPaymentReview.tsx, AdminPartnerProfile.tsx,
--    reportsApi.ts aggregate reports)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "financial_transactions_select_admin" ON public.financial_transactions;
CREATE POLICY "financial_transactions_select_admin"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ------------------------------------------------------------
-- 2. Customer — only their own transactions (PaymentPage.tsx)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "financial_transactions_select_customer" ON public.financial_transactions;
CREATE POLICY "financial_transactions_select_customer"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- ------------------------------------------------------------
-- 3. Delivery rider — only transactions tied to orders assigned to them
--    (DeliveryDriverEarnings.tsx, DeliveryDriverOrderDetails.tsx)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "financial_transactions_select_rider" ON public.financial_transactions;
CREATE POLICY "financial_transactions_select_rider"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.delivery_orders d
      JOIN public.riders r ON r.id = d.rider_id
      WHERE d.id = financial_transactions.reference_id
        AND r.user_id = auth.uid()
    )
  );

-- Note: the existing "Partners read own financial_transactions" policy from
-- migration 021 (partner_id = auth.uid()) is left untouched — it already
-- covers the delivery-company/partner read case correctly.

-- ------------------------------------------------------------
-- 4. Safe write path — SECURITY DEFINER function instead of an open INSERT
--    policy. Mirrors accountingApi.ts's createFinancialTransaction() params
--    exactly, and verifies the caller actually has a legitimate relationship
--    to the referenced entity before writing, the same pattern used by
--    approve_payment_transaction / assign_rider_to_order in migrations 021/022.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_financial_transaction(
  p_transaction_type text,
  p_reference_id uuid,
  p_customer_id uuid,
  p_partner_id uuid,
  p_amount numeric,
  p_platform_commission numeric,
  p_partner_earning numeric,
  p_payment_method text,
  p_payment_status text DEFAULT 'pending',
  p_due_date timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS public.financial_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.financial_transactions%ROWTYPE;
  v_authorized boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح: يجب تسجيل الدخول';
  END IF;

  -- The caller must be either: the partner this transaction is billed to,
  -- the customer it's billed to, an admin, or the rider assigned to the
  -- referenced delivery order. This mirrors the read policies above so a
  -- caller can never create a transaction for an entity they have no
  -- relationship to.
  IF p_partner_id = auth.uid() OR p_customer_id = auth.uid() THEN
    v_authorized := true;
  ELSIF public.has_role(auth.uid(), 'admin') THEN
    v_authorized := true;
  ELSIF EXISTS (
    SELECT 1
    FROM public.delivery_orders d
    JOIN public.riders r ON r.id = d.rider_id
    WHERE d.id = p_reference_id
      AND r.user_id = auth.uid()
  ) THEN
    v_authorized := true;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'غير مصرح: لا توجد علاقة فعلية بينك وبين هذه المعاملة';
  END IF;

  INSERT INTO public.financial_transactions (
    transaction_type, reference_id, customer_id, partner_id, amount,
    platform_commission, partner_earning, payment_method, payment_status,
    due_date, metadata
  ) VALUES (
    p_transaction_type, p_reference_id, p_customer_id, p_partner_id, p_amount,
    p_platform_commission, p_partner_earning, p_payment_method,
    COALESCE(p_payment_status, 'pending'), p_due_date, p_metadata
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_financial_transaction(
  text, uuid, uuid, uuid, numeric, numeric, numeric, text, text, timestamptz, jsonb
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_financial_transaction(
  text, uuid, uuid, uuid, numeric, numeric, numeric, text, text, timestamptz, jsonb
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_financial_transaction(
  text, uuid, uuid, uuid, numeric, numeric, numeric, text, text, timestamptz, jsonb
) TO authenticated;

-- No direct INSERT/UPDATE/DELETE policy is added for authenticated/anon on
-- this table by design — all writes must go through the function above (or
-- service_role, e.g. server-side jobs).
