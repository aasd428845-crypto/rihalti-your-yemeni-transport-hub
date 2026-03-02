
-- Add new columns to trips table for enhanced trip details
ALTER TABLE trips ADD COLUMN IF NOT EXISTS departure_days TEXT[];
ALTER TABLE trips ADD COLUMN IF NOT EXISTS check_in_time TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS check_in_location TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS luggage_weight TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_type TEXT DEFAULT 'عادي';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrival_time TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_phone TEXT;

-- Add public select policy for profiles so trip details can show supplier info
CREATE POLICY "Anyone can view supplier profiles" ON profiles FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = profiles.user_id AND user_roles.role IN ('supplier', 'delivery_company'))
);
