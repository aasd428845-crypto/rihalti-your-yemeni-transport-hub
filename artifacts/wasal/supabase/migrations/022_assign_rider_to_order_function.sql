-- ============================================================
-- Atomic rider assignment via SECURITY DEFINER function
--
-- Context: src/lib/deliveryApi.ts assignRiderToOrder() did 4 separate
-- client-side calls (cancel old cash collection, update order, insert
-- tracking entry, insert new cash collection) with no single transaction
-- and no check for a race condition where two dispatchers assign
-- different riders to the same order at nearly the same time -- the
-- second call would silently overwrite the first with no error.
--
-- Fix: one SECURITY DEFINER function does all 4 steps atomically, locks
-- the order row (FOR UPDATE) before checking/writing it, and rejects the
-- assignment with a clear error if the order was already assigned to a
-- *different* rider and is still active. Re-assigning the same rider to
-- the same order is treated as a no-op success (idempotent).
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_rider_to_order(
  p_order_id uuid,
  p_rider_id uuid,
  p_assigned_by uuid
)
RETURNS public.delivery_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.delivery_orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_assigned_by THEN
    RAISE EXCEPTION 'غير مصرح: معرف المُعيِّن لا يطابق المستخدم الحالي';
  END IF;

  SELECT * INTO v_order
  FROM public.delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  IF v_order.delivery_company_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'غير مصرح: هذا الطلب لا يخص شركتك';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'لا يمكن تعيين مندوب لطلب ملغى';
  END IF;

  -- Idempotent: already assigned to the same rider -> succeed without redoing work
  IF v_order.rider_id = p_rider_id THEN
    RETURN v_order;
  END IF;

  -- Race condition guard: already assigned to a DIFFERENT rider and still active
  IF v_order.rider_id IS NOT NULL AND v_order.status NOT IN ('cancelled', 'delivered') THEN
    RAISE EXCEPTION 'تم تعيين مندوب آخر لهذا الطلب بالفعل';
  END IF;

  -- 1. Cancel any previously active cash collection for this order
  UPDATE public.rider_cash_collections
  SET status = 'cancelled',
      notes = 'تم إعادة تعيين مندوب آخر'
  WHERE order_id = p_order_id
    AND status IN ('pending_pickup', 'collected');

  -- 2. Assign rider on the order
  UPDATE public.delivery_orders
  SET rider_id = p_rider_id,
      status = 'assigned',
      assigned_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- 3. Add tracking entry
  INSERT INTO public.order_tracking (order_id, status, note)
  VALUES (p_order_id, 'assigned', 'تم تعيين مندوب');

  -- 4. If payment is cash and amount > 0, record outstanding cash on rider
  IF v_order.payment_method = 'cash' AND COALESCE(v_order.total, 0) > 0 THEN
    INSERT INTO public.rider_cash_collections (rider_id, delivery_company_id, order_id, amount, status)
    VALUES (p_rider_id, v_order.delivery_company_id, p_order_id, v_order.total, 'pending_pickup');
  END IF;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_rider_to_order(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_rider_to_order(uuid, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_rider_to_order(uuid, uuid, uuid) TO authenticated;
