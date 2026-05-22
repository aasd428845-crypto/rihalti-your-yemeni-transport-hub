-- Migration 007: Add customer_name to customer_addresses + Fix delivery_orders RLS
-- Run this in Supabase SQL Editor

-- 1. Add customer_name column to customer_addresses
ALTER TABLE customer_addresses
  ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 2. Fix delivery_orders RLS policies
-- Allow insert for:
--   (a) authenticated users where customer_id matches their UID
--   (b) guest/anonymous users where customer_id is NULL

-- Drop existing insert policies (if any)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'delivery_orders' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON delivery_orders', pol.policyname);
  END LOOP;
END $$;

-- Create new insert policy
CREATE POLICY "delivery_orders_insert_policy" ON delivery_orders
  FOR INSERT
  WITH CHECK (
    customer_id IS NULL
    OR customer_id = auth.uid()
  );

-- Ensure RLS is enabled
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

-- 3. Also allow anonymous users to insert into delivery_orders
-- (Supabase requires anon role grants for this)
GRANT INSERT ON delivery_orders TO anon;
GRANT INSERT ON delivery_orders TO authenticated;

-- 4. Fix customer_addresses RLS (allow authenticated users full access to their own rows)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'customer_addresses'
  LOOP
    EXECUTE format('DROP POLICY %I ON customer_addresses', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "customer_addresses_select" ON customer_addresses
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "customer_addresses_insert" ON customer_addresses
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "customer_addresses_update" ON customer_addresses
  FOR UPDATE USING (customer_id = auth.uid());

CREATE POLICY "customer_addresses_delete" ON customer_addresses
  FOR DELETE USING (customer_id = auth.uid());

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
