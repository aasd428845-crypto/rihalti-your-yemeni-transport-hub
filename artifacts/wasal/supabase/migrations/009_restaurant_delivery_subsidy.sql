-- When a restaurant offers free delivery, the actual distance-based fee
-- is recorded here as a charge against the restaurant instead of the customer.
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS restaurant_delivery_subsidy NUMERIC NOT NULL DEFAULT 0;
