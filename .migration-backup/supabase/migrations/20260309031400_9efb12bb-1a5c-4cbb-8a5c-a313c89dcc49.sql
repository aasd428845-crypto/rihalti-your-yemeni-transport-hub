
-- Loyalty Points table
CREATE TABLE public.loyalty_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_redeemed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_loyalty_points_user ON public.loyalty_points(user_id);

-- Loyalty Points History
CREATE TABLE public.loyalty_points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'earn',
  description TEXT,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loyalty_history_user ON public.loyalty_points_history(user_id);

-- Add multi-dimensional rating columns to reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS rating_punctuality INTEGER,
  ADD COLUMN IF NOT EXISTS rating_cleanliness INTEGER,
  ADD COLUMN IF NOT EXISTS rating_communication INTEGER;

-- RLS for loyalty_points
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON public.loyalty_points
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can manage points" ON public.loyalty_points
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS for loyalty_points_history
ALTER TABLE public.loyalty_points_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.loyalty_points_history
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert history" ON public.loyalty_points_history
  FOR INSERT
  WITH CHECK (true);

-- Function to add loyalty points
CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  _user_id UUID,
  _points INTEGER,
  _description TEXT DEFAULT '',
  _reference_id UUID DEFAULT NULL,
  _reference_type TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.loyalty_points (user_id, points, total_earned)
  VALUES (_user_id, _points, _points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    points = loyalty_points.points + _points,
    total_earned = loyalty_points.total_earned + _points,
    updated_at = now();

  INSERT INTO public.loyalty_points_history (user_id, points, type, description, reference_id, reference_type)
  VALUES (_user_id, _points, 'earn', _description, _reference_id, _reference_type);
END;
$$;

-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  _user_id UUID,
  _points INTEGER,
  _description TEXT DEFAULT 'استبدال نقاط'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current INTEGER;
BEGIN
  SELECT points INTO _current FROM public.loyalty_points WHERE user_id = _user_id;
  IF _current IS NULL OR _current < _points THEN
    RETURN false;
  END IF;

  UPDATE public.loyalty_points
  SET points = points - _points,
      total_redeemed = total_redeemed + _points,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.loyalty_points_history (user_id, points, type, description)
  VALUES (_user_id, -_points, 'redeem', _description);

  RETURN true;
END;
$$;
