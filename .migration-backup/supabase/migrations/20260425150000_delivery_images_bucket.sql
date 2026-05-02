-- Create a public storage bucket for delivery/parcel images uploaded by customers
-- and ensure payment-receipts is publicly viewable so the delivery company can see
-- the customer's transfer slip in the orders page.

INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-images', 'delivery-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Make payment-receipts public so getPublicUrl() works in the company dashboard.
UPDATE storage.buckets SET public = true WHERE id = 'payment-receipts';

-- Storage policies for delivery-images: anyone authenticated can upload, everyone can read.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'delivery-images public read'
  ) THEN
    CREATE POLICY "delivery-images public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'delivery-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'delivery-images authenticated upload'
  ) THEN
    CREATE POLICY "delivery-images authenticated upload"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'delivery-images' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'payment-receipts public read'
  ) THEN
    CREATE POLICY "payment-receipts public read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'payment-receipts');
  END IF;
END $$;
