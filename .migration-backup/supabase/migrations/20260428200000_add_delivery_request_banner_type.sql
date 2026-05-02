-- Allow `delivery_request` as a valid banner_type so the small green CTA banner
-- (between "الأكثر تقييماً" and "مختارات لك" on the home page) can be saved
-- and managed from the delivery company's dashboard.

ALTER TABLE public.delivery_banners
  DROP CONSTRAINT IF EXISTS delivery_banners_banner_type_check;

ALTER TABLE public.delivery_banners
  ADD CONSTRAINT delivery_banners_banner_type_check
  CHECK (banner_type IN ('carousel', 'offer', 'service_tile', 'delivery_request'));
