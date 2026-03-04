
-- Add 'driver' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';

-- Add new columns to profiles for partner verification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_image_front TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_image_back TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selfie_image TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_image TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vehicle_image TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'approved';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_secondary TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- Validation trigger for account_status
CREATE OR REPLACE FUNCTION public.validate_profile_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_status IS NOT NULL AND NEW.account_status NOT IN ('pending', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid account_status: %. Must be pending, approved, rejected, or suspended.', NEW.account_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_profile_status_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_status();

-- Storage buckets for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('id-images', 'id-images', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('license-images', 'license-images', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-images', 'vehicle-images', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('selfie-images', 'selfie-images', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies: id-images
CREATE POLICY "Users upload own id images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'id-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own id images" ON storage.objects FOR SELECT USING (bucket_id = 'id-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins view all id images" ON storage.objects FOR SELECT USING (bucket_id = 'id-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: license-images
CREATE POLICY "Users upload own license images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'license-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own license images" ON storage.objects FOR SELECT USING (bucket_id = 'license-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins view all license images" ON storage.objects FOR SELECT USING (bucket_id = 'license-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: vehicle-images
CREATE POLICY "Users upload own vehicle images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vehicle-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own vehicle images" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins view all vehicle images" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: selfie-images
CREATE POLICY "Users upload own selfie images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'selfie-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users view own selfie images" ON storage.objects FOR SELECT USING (bucket_id = 'selfie-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins view all selfie images" ON storage.objects FOR SELECT USING (bucket_id = 'selfie-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: company-logos
CREATE POLICY "Users upload own company logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Anyone can view company logos" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
