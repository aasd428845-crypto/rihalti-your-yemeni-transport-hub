-- ─── Rider Cash Collections ────────────────────────────────────────────────
-- يسجّل المبالغ النقدية التي يجب على المندوب تحصيلها وتسليمها للشركة
-- الحالات:
--   pending_pickup → تم تعيين المندوب، لم يُستلم الطرد بعد
--   collected     → تم التوصيل والمندوب يحتفظ بالمبلغ النقدي
--   settled       → سلّم المندوب المبلغ للشركة
--   cancelled     → تم إلغاء الطلب أو إعادة تعيين مندوب آخر

CREATE TABLE IF NOT EXISTS public.rider_cash_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  delivery_company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending_pickup'
    CHECK (status IN ('pending_pickup', 'collected', 'settled', 'cancelled')),
  collected_at TIMESTAMPTZ,
  settled_at  TIMESTAMPTZ,
  settled_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active collection per order (re-assignments will mark old ones cancelled)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rider_cash_one_active_per_order
  ON public.rider_cash_collections (order_id)
  WHERE status IN ('pending_pickup', 'collected');

CREATE INDEX IF NOT EXISTS idx_rider_cash_rider_status
  ON public.rider_cash_collections (rider_id, status);

CREATE INDEX IF NOT EXISTS idx_rider_cash_company_status
  ON public.rider_cash_collections (delivery_company_id, status);

ALTER TABLE public.rider_cash_collections ENABLE ROW LEVEL SECURITY;

-- Delivery company can manage all its riders' collections
DROP POLICY IF EXISTS "Company manages its rider collections" ON public.rider_cash_collections;
CREATE POLICY "Company manages its rider collections"
  ON public.rider_cash_collections
  FOR ALL
  TO authenticated
  USING (delivery_company_id = auth.uid())
  WITH CHECK (delivery_company_id = auth.uid());

-- Rider can view their own collection records
DROP POLICY IF EXISTS "Rider views own collections" ON public.rider_cash_collections;
CREATE POLICY "Rider views own collections"
  ON public.rider_cash_collections
  FOR SELECT
  TO authenticated
  USING (
    rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_rider_cash_collections()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_rider_cash_collections ON public.rider_cash_collections;
CREATE TRIGGER trg_touch_rider_cash_collections
  BEFORE UPDATE ON public.rider_cash_collections
  FOR EACH ROW EXECUTE FUNCTION public.touch_rider_cash_collections();
