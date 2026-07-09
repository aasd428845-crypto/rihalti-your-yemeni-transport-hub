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

## payment_transactions / financial_transactions approval flow
`entity_type` and `related_entity_id` on `payment_transactions` are NOT NULL — any insert/test data needs both set (e.g. `entity_type='delivery'`, `related_entity_id=gen_random_uuid()`).
Approve/reject now go through `public.approve_payment_transaction(p_transaction_id, p_approver_id)` / `reject_payment_transaction(...)` SECURITY DEFINER RPCs (see `supabase/migrations/021_payment_approval_functions.sql`) — never re-add direct client `.update()` chains on `payment_transactions`/`financial_transactions` for this flow, it defeats the atomicity + ownership checks.

**Why:** frontend previously did 3-4 sequential unguarded updates across `payment_transactions`, `financial_transactions`, `delivery_orders`/`bookings`, `notifications` — partial failure left inconsistent state, and it silently broke once `financial_transactions` was RLS-locked to service_role.

**How to apply:** any new payment-approval-like flow should follow the same pattern — one SECURITY DEFINER function per action, ownership check against `auth.uid()` inside the function (never trust a client-passed approver id alone), `SET search_path = public`, and explicit `REVOKE ... FROM PUBLIC, anon` + `GRANT EXECUTE ... TO authenticated` (Supabase grants EXECUTE to `anon` by default on new functions — must revoke it explicitly, not just from PUBLIC).

## delivery_orders rider assignment
`assignRiderToOrder` in `deliveryApi.ts` now calls `public.assign_rider_to_order(p_order_id, p_rider_id, p_assigned_by)` SECURITY DEFINER RPC (see `supabase/migrations/022_assign_rider_to_order_function.sql`) instead of 4 separate client updates — same atomicity/ownership pattern as the payment approval RPCs above, plus a `FOR UPDATE` row lock + explicit "already assigned to a different active rider" rejection to close a dispatch race condition.
`rider_cash_collections.delivery_company_id` FK references `auth.users(id)`, NOT `profiles.id` — use `profiles.user_id`/`riders.delivery_company_id` (the actual auth uid), not `profiles.id`, when testing or seeding this table.
`riders.id` is its own PK distinct from `profiles.id`/`auth.users.id` — `rider_cash_collections.rider_id` FKs to `riders.id`.

## app_settings
Table is NOT in Supabase type definitions — always query via `(supabase as any).from("app_settings")`.

**Why:** DB was likely created without this table in the public schema types, or schema was generated before this table existed.

**How to apply:** Any new code reading/writing `app_settings` must use the `as any` cast.
