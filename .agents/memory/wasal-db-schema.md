---
name: Wasal DB Schema quirks
description: Key schema facts not obvious from code — table column availability and naming patterns
---

## delivery_companies
Only has: `id`, `created_at`, `is_active`. NO `company_name`, NO `user_id`.
Delivery company names come from `profiles.full_name` where `profiles.user_id = auth user id`.
Delivery company role identified via `user_roles.role = 'delivery_company'`.

## financial_transactions
Missing columns in current DB (must be added via migration):
- `partner_type TEXT DEFAULT 'delivery_company'`
- `order_id UUID`
Use `(supabase as any)` cast when writing to these columns so TypeScript doesn't block — and the insert is wrapped in try/catch so it never blocks order creation.

## restaurant_promotions
Only has: `id`, `title`, `description`, `is_active`, `sort_order`, `restaurant_id`.
All other promo columns (image_url, badge_text, etc.) are absent — sending them causes Supabase insert errors.

## delivery_banners
Single source of truth for customer carousel: `image_url`, `tile_action`, `link_url`, `banner_type`.

## app_settings
Table is NOT in Supabase type definitions — always query via `(supabase as any).from("app_settings")`.

**Why:** DB was likely created without this table in the public schema types, or schema was generated before this table existed.

**How to apply:** Any new code reading/writing `app_settings` must use the `as any` cast.
