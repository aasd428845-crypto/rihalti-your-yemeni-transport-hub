-- ============================================================
-- Atomic order status update via SECURITY DEFINER function
--
-- Context: src/lib/deliveryApi.ts updateOrderStatus() did 3 separate
-- client-side calls (update delivery_orders, insert order_tracking,
-- sync rider_cash_collections) with the 3rd step wrapped in a silent
-- try/catch (_) {} -- any failure there was swallowed, leaving the order
-- marked delivered/cancelled while its cash collection record stayed
-- stuck in "pending_pickup"/"collected" forever.
--
-- Fix: one SECURITY DEFINER function does all 3 steps atomically. Any
-- failure raises an exception and rolls back the whole operation instead
-- of failing silently.
--
-- Called from two different dashboards:
--   - DeliveryOrders.tsx      (delivery company managing its own orders)
--   - DeliveryDriverOrders.tsx / DeliveryDriverDashboard.tsx (the rider
--     assigned to the order)
-- so the ownership check accepts EITHER the owning delivery company OR
-- the currently-assigned rider.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_delivery_order_status(
  p_order_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS public.delivery_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.delivery_orders%ROWTYPE;
  v_is_owner boolean;
  v_is_assigned_rider boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح: يجب تسجيل الدخول';
  END IF;

  SELECT * INTO v_order
  FROM public.delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  v_is_owner := (v_order.delivery_company_id = auth.uid());

  v_is_assigned_rider := EXISTS (
    SELECT 1 FROM public.riders
    WHERE riders.id = v_order.rider_id
      AND riders.user_id = auth.uid()
  );

  IF NOT (v_is_owner OR v_is_assigned_rider) THEN
    RAISE EXCEPTION 'غير مصرح: هذا الطلب لا يخص شركتك ولست المندوب المعيّن عليه';
  END IF;

  -- 1. Update the order itself
  UPDATE public.delivery_orders
  SET status = p_status,
      updated_at = now(),
      picked_up_at = CASE WHEN p_status = 'picked_up' THEN now() ELSE picked_up_at END,
      delivered_at = CASE WHEN p_status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- 2. Add tracking entry
  INSERT INTO public.order_tracking (order_id, status, note)
  VALUES (p_order_id, p_status, p_note);

  -- 3. Sync rider cash collection status
  IF p_status = 'delivered' THEN
    UPDATE public.rider_cash_collections
    SET status = 'collected',
        collected_at = now()
    WHERE order_id = p_order_id
      AND status = 'pending_pickup';
  ELSIF p_status = 'cancelled' THEN
    UPDATE public.rider_cash_collections
    SET status = 'cancelled',
        notes = 'تم إلغاء الطلب'
    WHERE order_id = p_order_id
      AND status IN ('pending_pickup', 'collected');
  END IF;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.update_delivery_order_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_delivery_order_status(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_delivery_order_status(uuid, text, text) TO authenticated;
