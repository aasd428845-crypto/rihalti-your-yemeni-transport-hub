-- ============================================================
-- 030: Add rider_id to financial_transactions and move the
--      financial-transaction insert inside update_delivery_order_status.
--
-- Problems fixed:
--   1. DeliveryDriverOrderDetails.tsx inserted financial_transactions
--      directly from the browser — silently failed because the table has
--      no INSERT policy (all writes must go through SECURITY DEFINER fns).
--   2. partner_id was incorrectly set to the rider's auth.uid() instead
--      of the delivery company's uuid, breaking DeliveryFinance.tsx reports.
--   3. No column existed to let DeliveryDriverEarnings.tsx filter by rider.
--
-- Solution:
--   A. Add rider_id (FK → riders.id) to financial_transactions.
--   B. Replace update_delivery_order_status so that on status = 'delivered'
--      it inserts financial_transactions internally (SECURITY DEFINER bypasses
--      RLS safely because the caller was already validated).  Commission is
--      read from accounting_settings inside the function — client cannot spoof.
--   C. Simplify the rider SELECT policy: direct rider_id match instead of JOIN.
-- ============================================================

-- ── A. New column ─────────────────────────────────────────────────────────────
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS rider_id uuid
  REFERENCES public.riders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_rider_id
  ON public.financial_transactions (rider_id);

-- ── B. Replace the status-update function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_delivery_order_status(
  p_order_id uuid,
  p_status   text,
  p_note     text DEFAULT NULL
)
RETURNS public.delivery_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           public.delivery_orders%ROWTYPE;
  v_is_owner        boolean;
  v_is_rider        boolean;
  v_rider_row       public.riders%ROWTYPE;
  v_comm_rate       numeric;
  v_amount          numeric;
  v_commission      numeric;
BEGIN
  -- ── Auth guard ──────────────────────────────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح: يجب تسجيل الدخول';
  END IF;

  -- Lock the row for the duration of this transaction
  SELECT * INTO v_order
  FROM public.delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الطلب غير موجود';
  END IF;

  -- ── Ownership check ─────────────────────────────────────────────────────────
  v_is_owner := (v_order.delivery_company_id = auth.uid());

  v_is_rider := EXISTS (
    SELECT 1 FROM public.riders
    WHERE id      = v_order.rider_id
      AND user_id = auth.uid()
  );

  IF NOT (v_is_owner OR v_is_rider) THEN
    RAISE EXCEPTION 'غير مصرح: هذا الطلب لا يخص شركتك ولست المندوب المعيّن عليه';
  END IF;

  -- ── 1. Update delivery_orders ────────────────────────────────────────────────
  UPDATE public.delivery_orders
  SET
    status       = p_status,
    updated_at   = now(),
    picked_up_at = CASE WHEN p_status = 'picked_up' THEN now() ELSE picked_up_at END,
    delivered_at = CASE WHEN p_status = 'delivered'  THEN now() ELSE delivered_at END
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  -- ── 2. Order tracking ────────────────────────────────────────────────────────
  INSERT INTO public.order_tracking (order_id, status, note)
  VALUES (p_order_id, p_status, p_note);

  -- ── 3. Delivered → financial_transactions + cash collection ─────────────────
  IF p_status = 'delivered' THEN

    -- Only insert once — idempotency guard
    IF NOT EXISTS (
      SELECT 1 FROM public.financial_transactions
      WHERE reference_id      = p_order_id
        AND transaction_type  = 'delivery'
    ) AND v_order.delivery_company_id IS NOT NULL THEN

      -- Fetch the actual rider row so we capture riders.id (not auth.uid())
      SELECT * INTO v_rider_row
      FROM public.riders
      WHERE id = v_order.rider_id;

      -- Read commission rate server-side — never trust the client
      SELECT COALESCE(global_commission_delivery, 12)
      INTO   v_comm_rate
      FROM   public.accounting_settings
      LIMIT  1;

      IF v_comm_rate IS NULL THEN
        v_comm_rate := 12;
      END IF;

      v_amount     := COALESCE(v_order.delivery_fee, v_order.total, 0);
      v_commission := FLOOR(v_amount * v_comm_rate / 100.0);

      INSERT INTO public.financial_transactions (
        transaction_type,
        reference_id,
        customer_id,
        partner_id,        -- delivery company (for DeliveryFinance.tsx)
        rider_id,          -- riders.id       (for DeliveryDriverEarnings.tsx)
        amount,
        platform_commission,
        partner_earning,
        payment_method,
        payment_status
      ) VALUES (
        'delivery',
        v_order.id,
        v_order.customer_id,
        v_order.delivery_company_id,
        v_rider_row.id,
        v_amount,
        v_commission,
        v_amount - v_commission,
        COALESCE(v_order.payment_method, 'cash'),
        'pending'
      );
    END IF;

    -- Sync cash collection
    UPDATE public.rider_cash_collections
    SET status       = 'collected',
        collected_at = now()
    WHERE order_id = p_order_id
      AND status   = 'pending_pickup';

  -- ── 4. Cancelled → reverse cash collection ──────────────────────────────────
  ELSIF p_status = 'cancelled' THEN
    UPDATE public.rider_cash_collections
    SET status = 'cancelled',
        notes  = 'تم إلغاء الطلب'
    WHERE order_id = p_order_id
      AND status   IN ('pending_pickup', 'collected');
  END IF;

  RETURN v_order;
END;
$$;

-- Permissions unchanged — authenticated only, no anon/public
REVOKE ALL ON FUNCTION public.update_delivery_order_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_delivery_order_status(uuid, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.update_delivery_order_status(uuid, text, text) TO authenticated;

-- ── C. Simplify rider RLS policy on financial_transactions ───────────────────
-- Old policy used a JOIN through delivery_orders; new rider_id column is direct.
DROP POLICY IF EXISTS "financial_transactions_select_rider" ON public.financial_transactions;

CREATE POLICY "financial_transactions_select_rider"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (
    rider_id IN (
      SELECT id FROM public.riders WHERE user_id = auth.uid()
    )
  );

-- Note: the "Partners read own financial_transactions" policy (partner_id = auth.uid())
-- from migration 021/027 remains untouched — it covers delivery-company reads.
