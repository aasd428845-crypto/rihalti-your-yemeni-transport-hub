---
name: Wasal types.ts staleness
description: Manually-maintained Supabase types.ts in artifacts/wasal can lag behind the live DB schema; how to verify and what's been found stale.
---

`SUPABASE_ACCESS_TOKEN` is not exposed to bash/code_execution, so `supabase gen types typescript` cannot be run directly here — types.ts has been maintained by hand against migration files, which can drift from the live schema.

**Why:** Found two concrete drifts: `delivery_orders` was missing `restaurant_delivery_subsidy` and `applied_offer_type` columns (confirmed present live via a REST probe), and `payment_transactions` has no actual FK to `profiles` (an embedded `profiles:user_id(...)` select failed at runtime with PGRST200, even though it type-compiled once cast away with `any`).

**How to apply:** Before trusting a `Tables<'x'>` type or an embedded/joined `.select()` against a table, spot-check the columns/FKs against the live DB (e.g. a quick REST probe with the anon key) rather than assuming types.ts is authoritative. If a join has no real FK, fetch the related rows separately by ID and merge client-side instead of using PostgREST embedding syntax.
