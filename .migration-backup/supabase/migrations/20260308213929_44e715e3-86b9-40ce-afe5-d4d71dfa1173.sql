
-- Allow delivery drivers to read orders from their company
CREATE POLICY "Delivery drivers view company orders"
ON public.delivery_orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_drivers dd
    WHERE dd.user_id = auth.uid()
      AND dd.delivery_company_id = delivery_orders.delivery_company_id
      AND dd.is_approved = true
  )
);

-- Allow delivery drivers to update orders (accept, status changes)
CREATE POLICY "Delivery drivers update assigned orders"
ON public.delivery_orders FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_drivers dd
    WHERE dd.user_id = auth.uid()
      AND dd.delivery_company_id = delivery_orders.delivery_company_id
      AND dd.is_approved = true
  )
);
