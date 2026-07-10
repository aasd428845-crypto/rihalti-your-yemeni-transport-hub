-- ============================================================
-- Atomic ADMIN payment approval/rejection via SECURITY DEFINER functions
--
-- Context: src/pages/admin/AdminPaymentReview.tsx has its own handleVerify /
-- handleReject, entirely separate from approve_payment_transaction /
-- reject_payment_transaction (migration 021), which were written for the
-- delivery-company partner flow only (DeliveryFinance.tsx) and only handle
-- entity_type = 'delivery'. The admin flow additionally handles 'booking'
-- and 'shipment', and — like the partner flow before 021 — does several
-- separate non-atomic client-side update() calls, including a direct write
-- to financial_transactions which is now blocked for authenticated users
-- (migration 028 removed all direct INSERT/UPDATE/DELETE access to that
-- table; only SELECT policies + the create_financial_transaction() RPC
-- exist). Left as-is, the admin approve/reject flow would silently fail on
-- step 2 of every approval.
--
-- Fix: two new SECURITY DEFINER functions, admin_approve_payment_transaction
-- and admin_reject_payment_transaction, run all steps in one transaction and
-- verify the caller is an actual admin (has_role(auth.uid(), 'admin')) before
-- doing anything — never trusting a role claim from the client. These are
-- intentionally separate functions/names from the 021 partner ones (rather
-- than reusing them) because the authorization check and entity coverage
-- genuinely differ: partner functions verify "this transaction belongs to
-- your company" and only touch delivery_orders; admin functions verify
-- "caller is admin" and touch bookings/shipment_requests/delivery_orders.
-- ============================================================

-- ------------------------------------------------------------
-- 1. admin_approve_payment_transaction
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_payment_transaction(
  p_transaction_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح: هذا الإجراء متاح للمشرفين فقط';
  END IF;

  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المعاملة المالية غير موجودة';
  END IF;

  IF v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'تمت معالجة هذه المعاملة مسبقاً (الحالة الحالية: %)', v_tx.status;
  END IF;

  -- 1. payment_transactions -> verified
  UPDATE public.payment_transactions
  SET status = 'verified',
      verified_by = auth.uid(),
      verified_at = now()
  WHERE id = p_transaction_id;

  -- 2. financial_transactions -> paid (matches the entity this payment
  --    transaction was for, via reference_id = payment_transactions.related_entity_id)
  UPDATE public.financial_transactions
  SET payment_status = 'paid',
      paid_at = now()
  WHERE reference_id = v_tx.related_entity_id;

  -- 3. related order/booking/shipment -> confirmed/approved, same three
  --    entity types AdminPaymentReview.tsx's handleVerify currently covers
  IF v_tx.related_entity_id IS NOT NULL THEN
    IF v_tx.entity_type = 'booking' THEN
      UPDATE public.bookings
      SET status = 'confirmed'
      WHERE id = v_tx.related_entity_id;
    ELSIF v_tx.entity_type = 'shipment' THEN
      UPDATE public.shipment_requests
      SET status = 'approved'
      WHERE id = v_tx.related_entity_id;
    ELSIF v_tx.entity_type = 'delivery' THEN
      UPDATE public.delivery_orders
      SET status = 'confirmed'
      WHERE id = v_tx.related_entity_id;
    END IF;
  END IF;

  -- 4. notify the customer
  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (
    v_tx.user_id,
    'تم تأكيد الدفع ✅',
    'تم تأكيد حوالتك بمبلغ ' || to_char(v_tx.amount, 'FM999,999,999') || ' ر.ي',
    jsonb_build_object('type', 'payment_verified', 'payment_transaction_id', v_tx.id)
  );
END;
$$;

-- ------------------------------------------------------------
-- 2. admin_reject_payment_transaction
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reject_payment_transaction(
  p_transaction_id uuid,
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
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح: هذا الإجراء متاح للمشرفين فقط';
  END IF;

  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'المعاملة المالية غير موجودة';
  END IF;

  IF v_tx.status <> 'pending' THEN
    RAISE EXCEPTION 'تمت معالجة هذه المعاملة مسبقاً (الحالة الحالية: %)', v_tx.status;
  END IF;

  UPDATE public.payment_transactions
  SET status = 'rejected',
      verified_by = auth.uid(),
      verified_at = now(),
      notes = p_reason
  WHERE id = p_transaction_id;

  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (
    v_tx.user_id,
    'تم رفض الحوالة ❌',
    COALESCE(NULLIF(p_reason, ''), 'تم رفض حوالتك، يرجى التواصل مع الدعم'),
    jsonb_build_object('type', 'payment_rejected', 'payment_transaction_id', v_tx.id)
  );
END;
$$;

-- ------------------------------------------------------------
-- 3. Lock down execute privileges: authenticated only (same as migration 021)
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_approve_payment_transaction(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_payment_transaction(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_approve_payment_transaction(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_reject_payment_transaction(uuid, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.admin_approve_payment_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_payment_transaction(uuid, text) TO authenticated;

-- Note: authorization is enforced INSIDE the function body via
-- has_role(auth.uid(), 'admin'), not just by the EXECUTE grant — any
-- authenticated user can call these functions, but non-admins will hit the
-- RAISE EXCEPTION at the top and nothing will be written.
