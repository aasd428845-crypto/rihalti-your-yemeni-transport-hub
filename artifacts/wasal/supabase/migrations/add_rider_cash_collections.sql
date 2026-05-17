-- Migration: Create rider_cash_collections table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

CREATE TABLE IF NOT EXISTS public.rider_cash_collections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id            uuid REFERENCES public.riders(id) ON DELETE SET NULL,
  delivery_company_id uuid NOT NULL,
  order_id            uuid REFERENCES public.delivery_orders(id) ON DELETE SET NULL,
  amount              numeric NOT NULL,
  status              text NOT NULL DEFAULT 'pending_pickup',
  collected_at        timestamptz,
  settled_at          timestamptz,
  settled_by          uuid,
  notes               text,
  created_at          timestamptz DEFAULT now()
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_rcc_rider_id   ON public.rider_cash_collections(rider_id);
CREATE INDEX IF NOT EXISTS idx_rcc_order_id   ON public.rider_cash_collections(order_id);
CREATE INDEX IF NOT EXISTS idx_rcc_company_id ON public.rider_cash_collections(delivery_company_id);
CREATE INDEX IF NOT EXISTS idx_rcc_status     ON public.rider_cash_collections(status);

-- Enable Row Level Security (mirror pattern used by other tables)
ALTER TABLE public.rider_cash_collections ENABLE ROW LEVEL SECURITY;

-- Allow delivery company owners full access to their own records
CREATE POLICY "delivery_company_manage_cash_collections"
  ON public.rider_cash_collections
  FOR ALL
  USING (
    delivery_company_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
  );

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
