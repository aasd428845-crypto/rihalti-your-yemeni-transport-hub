-- Returns per-restaurant commission summary for a delivery company.
-- This is the SINGLE SOURCE OF TRUTH for commission numbers;
-- the frontend must NOT re-derive them from raw orders.
--
-- p_period: 'daily' | 'weekly' | 'monthly'
-- Week definition: Sunday-start (matches JavaScript Date.getDay() == 0).

CREATE OR REPLACE FUNCTION public.get_company_restaurant_commission_summary(
  p_company_id uuid,
  p_period     text DEFAULT 'monthly'
)
RETURNS TABLE (
  restaurant_id         uuid,
  commission_rate       numeric,
  total_food_revenue    numeric,
  total_commission_cut  numeric,
  period_food_revenue   numeric,
  period_commission_cut numeric,
  total_orders          bigint,
  period_orders         bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamptz;
BEGIN
  -- ── Period boundary ────────────────────────────────────────────────────────
  IF p_period = 'daily' THEN
    -- Start of today (server local date → UTC midnight equivalent)
    v_period_start := (current_date)::timestamptz;

  ELSIF p_period = 'weekly' THEN
    -- Sunday of the current week — mirrors JS: d.setDate(d.getDate() - d.getDay())
    -- extract(dow …) returns 0 for Sunday, matching JS getDay()
    v_period_start := (current_date - EXTRACT(dow FROM current_date)::int)::timestamptz;

  ELSE
    -- monthly: first day of the current month
    v_period_start := date_trunc('month', current_date::timestamptz);
  END IF;

  -- ── Aggregation ────────────────────────────────────────────────────────────
  RETURN QUERY
  SELECT
    r.id::uuid AS restaurant_id,

    COALESCE(r.commission_rate, 0)::numeric AS commission_rate,

    -- Total food revenue = SUM(total - delivery_fee) for all delivered orders
    COALESCE(
      SUM(o.total - o.delivery_fee) FILTER (WHERE o.status = 'delivered'),
      0
    )::numeric AS total_food_revenue,

    -- Commission cut uses FLOOR to exactly match: Math.floor(revenue * rate / 100)
    FLOOR(
      COALESCE(
        SUM(o.total - o.delivery_fee) FILTER (WHERE o.status = 'delivered'),
        0
      ) * COALESCE(r.commission_rate, 0) / 100
    )::numeric AS total_commission_cut,

    -- Period food revenue
    COALESCE(
      SUM(o.total - o.delivery_fee)
        FILTER (WHERE o.status = 'delivered' AND o.created_at >= v_period_start),
      0
    )::numeric AS period_food_revenue,

    -- Period commission cut
    FLOOR(
      COALESCE(
        SUM(o.total - o.delivery_fee)
          FILTER (WHERE o.status = 'delivered' AND o.created_at >= v_period_start),
        0
      ) * COALESCE(r.commission_rate, 0) / 100
    )::numeric AS period_commission_cut,

    COUNT(o.id) FILTER (WHERE o.status = 'delivered')::bigint AS total_orders,

    COUNT(o.id) FILTER (
      WHERE o.status = 'delivered' AND o.created_at >= v_period_start
    )::bigint AS period_orders

  FROM restaurants r
  LEFT JOIN delivery_orders o ON o.restaurant_id = r.id
  WHERE r.delivery_company_id = p_company_id
    AND r.is_active = true
  GROUP BY r.id, r.commission_rate;
END;
$$;

COMMENT ON FUNCTION public.get_company_restaurant_commission_summary(uuid, text) IS
  'Single source of truth for restaurant commission figures. '
  'Uses FLOOR(revenue * rate / 100) matching the original JS formula. '
  'Period: daily=today, weekly=Sun-start, monthly=1st of month.';
