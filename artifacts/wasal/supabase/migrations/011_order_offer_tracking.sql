-- Migration 011: Add applied offer tracking columns to delivery_orders
-- Run this in Supabase Dashboard → SQL Editor

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add offer tracking columns to delivery_orders
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS applied_offer_id   UUID    REFERENCES delivery_company_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS applied_offer_type  TEXT,
  ADD COLUMN IF NOT EXISTS applied_offer_title TEXT;

-- Index for analytics queries (count per offer, per restaurant)
CREATE INDEX IF NOT EXISTS idx_delivery_orders_applied_offer_id
  ON delivery_orders (applied_offer_id)
  WHERE applied_offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_orders_applied_offer_type
  ON delivery_orders (applied_offer_type)
  WHERE applied_offer_type IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. (Optional) Backfill: tag existing subsidised orders as free_delivery
--    so stats work for historical data before this migration.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE delivery_orders
SET applied_offer_type = 'free_delivery'
WHERE restaurant_delivery_subsidy > 0
  AND applied_offer_type IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: migration 010 (010_missing_offers_schema.sql) must be run FIRST.
-- It adds source_promo_id, sponsor_type, sponsor_name to delivery_company_offers
-- and fixes the offer_type CHECK constraint.
-- ─────────────────────────────────────────────────────────────────────────────
