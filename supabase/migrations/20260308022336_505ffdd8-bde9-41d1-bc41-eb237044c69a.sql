
-- Fix overly permissive SELECT on delivery_proof - restrict to participants
DROP POLICY IF EXISTS "Anyone can read delivery_proof" ON delivery_proof;
CREATE POLICY "Participants can read delivery_proof" ON delivery_proof
  FOR SELECT USING (
    auth.uid() = scanned_by
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM shipment_requests WHERE id = delivery_proof.order_id AND (customer_id = auth.uid() OR supplier_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM delivery_orders WHERE id = delivery_proof.order_id AND (customer_id = auth.uid() OR delivery_company_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM ride_requests WHERE id = delivery_proof.order_id AND (customer_id = auth.uid() OR driver_id = auth.uid()))
  );
