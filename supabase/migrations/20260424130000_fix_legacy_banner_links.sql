-- ────────────────────────────────────────────────────────────────────────────
-- Fix legacy banner links that still point to the old "/shipment-request" page
-- The old page (ShipmentRequestPage.tsx) shows a generic "ماذا تريد؟" picker.
-- The new customer flow lives at "/delivery-request" (DeliveryRequestPage.tsx)
-- and includes the 4-step wizard with delivery-company selection.
--
-- This migration is idempotent and safe to run multiple times.
-- It updates ONLY rows in delivery_banners whose link_url matches the legacy
-- value. It does not change banner titles, images, ordering, or any other
-- column. It does not affect the ShipmentRequestPage route itself, which is
-- still used elsewhere for inter-city parcel/taxi requests.
-- ────────────────────────────────────────────────────────────────────────────

UPDATE public.delivery_banners
SET link_url   = '/delivery-request',
    updated_at = NOW()
WHERE link_url IN ('/shipment-request', '/shipment-request/delivery');

-- Optional sanity check (will appear in the SQL editor result panel):
SELECT id, title, link_url, banner_type, is_active, sort_order
FROM public.delivery_banners
ORDER BY sort_order NULLS LAST, created_at;
