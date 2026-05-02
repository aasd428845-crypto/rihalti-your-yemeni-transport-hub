-- Allow drivers to view pending ride requests (not yet assigned)
CREATE POLICY "Drivers can view pending ride_requests"
ON public.ride_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'driver'::app_role)
  AND status = 'pending'
  AND negotiation_status = 'pending'
  AND driver_id IS NULL
);

-- Allow drivers to update pending ride requests (to submit price offer)
CREATE POLICY "Drivers can offer price on pending rides"
ON public.ride_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'driver'::app_role)
  AND status = 'pending'
  AND (driver_id IS NULL OR driver_id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'driver'::app_role)
);