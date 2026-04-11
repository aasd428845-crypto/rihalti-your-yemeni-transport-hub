-- Add coverage_areas column to restaurants table
-- This array holds the specific neighborhoods/areas within the city that the restaurant delivers to.
-- An empty array means the restaurant covers the entire city.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS coverage_areas TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.restaurants.coverage_areas IS
  'List of neighborhood/area names within the restaurant city that are explicitly covered for delivery. Empty = covers full city.';
