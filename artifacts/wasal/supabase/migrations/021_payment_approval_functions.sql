-- ============================================================
-- Atomic payment approval/rejection via SECURITY DEFINER functions
--
-- Context: src/pages/delivery/DeliveryFinance.tsx (handleApprove/handleReject)
-- was doing 3-4 separate client-side `update()` calls in sequence:
--   1. payment_transactions.status -> verified/rejected
--   2. financial_transactions.payment_status -> paid   (approve only)
--   3. delivery_orders/bookings status update           (approve only)
--   4. notifications insert
--
-- Problems fixed here:
--   (a) No atomicity: if step 3 failed after step 1 succeeded, data was
--       left in an inconsistent state (payment marked verified but the
--       order never got marked paid).
--   (b) After migration 020 locked financial_transactions to service_role
--       only, this client code could no longer write to it at all -- it
--       would silently fail step 2 forever.
--
-- Fix: two SECURITY DEFINER functions run all steps in a single
-- Postgres transaction (a PL/pgSQL function body is one transaction from
-- the caller's point of view -- any RAISE EXCEPTION rolls back every
-- change made so far). Ownership is verified server-side against
-- auth.uid(), not trusted from the client.
--
-- Also restores a SAFE, narrowly-scoped read policy on
-- financial_transactions (SELECT only, own partner_id) that was removed
-- by migration 020's full lockdown -- DeliveryPayments.tsx reads this
-- table directly to show a partner their own transaction history, which
-- is legitimate and was not part of the vulnerability (the vulnerability
-- was broad/unscoped access and direct client writes, not this).
-- ============================================================

-- ------------------------------------------------------------
-- 0. Restore safe partner-scoped read access to financial_transactions
-- ------------------------------------------------------------
CREATE POLICY "Partners read own financial_transactions"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (partner_id = auth.uid());

-- Note: still no INSERT/UPDATE/DELETE policy for anon/authenticated on
-- this table -- writes remain service_role-only / via the SECURITY
-- DEFINER functions below.

-- ------------------------------------------------------------
-- 1. approve_payment_transaction
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payment_transaction(
  p_transaction_id uuid,
  p_approver_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_approver_id THEN
    RAISE EXCEPTION 'غير مصرح: معرف الموافق لا يطابق المستخدم الحالي';
  END IF;

  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المعاملة المالية غير موجودة';
  END IF;

  IF v_tx.partner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'غير مصرح: هذه المعاملة لا تخص شركتك';
  END IF;

  IF v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'تمت معالجة هذه المعاملة مسبقاً (الحالة الحالية: %)', v_tx.status;
  END IF;

  -- 1. payment_transactions -> verified
  UPDATE public.payment_transactions
  SET status = 'verified',
      verified_by = p_approver_id,
      verified_at = now()
  WHERE id = p_transaction_id;

  -- 2. financial_transactions -> paid
  UPDATE public.financial_transactions
  SET payment_status = 'paid',
      paid_at = now()
  WHERE payment_transaction_id = p_transaction_id;

  -- 3. related order/booking -> confirmed
  IF v_tx.related_entity_id IS NOT NULL THEN
    IF v_tx.entity_type = 'delivery' THEN
      UPDATE public.delivery_orders
      SET payment_status = 'confirmed'
      WHERE id = v_tx.related_entity_id;
    ELSIF v_tx.entity_type = 'booking' THEN
      UPDATE public.bookings
      SET status = 'confirmed'
      WHERE id = v_tx.related_entity_id;
    END IF;
  END IF;

  -- 4. notify the customer
  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (
    v_tx.user_id,
    'تمت الموافقة على دفعتك ✅',
    'تم قبول دفعتك بقيمة ' || to_char(v_tx.amount, 'FM999,999,999') || ' ر.ي.',
    jsonb_build_object('type', 'payment_verified', 'payment_transaction_id', v_tx.id)
  );
END;
$$;

-- ------------------------------------------------------------
-- 2. reject_payment_transaction
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_payment_transaction(
  p_transaction_id uuid,
  p_approver_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_approver_id THEN
    RAISE EXCEPTION 'غير مصرح: معرف الموافق لا يطابق المستخدم الحالي';
  END IF;

  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المعاملة المالية غير موجودة';
  END IF;

  IF v_tx.partner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'غير مصرح: هذه المعاملة لا تخص شركتك';
  END IF;

  IF v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'تمت معالجة هذه المعاملة مسبقاً (الحالة الحالية: %)', v_tx.status;
  END IF;

  UPDATE public.payment_transactions
  SET status = 'rejected',
      verified_by = p_approver_id,
      verified_at = now(),
      notes = p_reason
  WHERE id = p_transaction_id;

  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (
    v_tx.user_id,
    'تم رفض الدفعة ❌',
    COALESCE(NULLIF(p_reason, ''), 'تم رفض الدفعة.'),
    jsonb_build_object('type', 'payment_rejected', 'payment_transaction_id', v_tx.id)
  );
END;
$$;

-- ------------------------------------------------------------
-- 3. Lock down execute privileges: authenticated only
-- ------------------------------------------------------------
-- Supabase grants EXECUTE on newly created functions to PUBLIC *and*
-- explicitly to the `anon` role by default -- both must be revoked, or
-- unauthenticated visitors could call these functions directly.
REVOKE ALL ON FUNCTION public.approve_payment_transaction(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_payment_transaction(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_transaction(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.reject_payment_transaction(uuid, uuid, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.approve_payment_transaction(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_transaction(uuid, uuid, text) TO authenticated;
