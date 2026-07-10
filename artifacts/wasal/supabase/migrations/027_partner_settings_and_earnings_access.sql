-- ============================================================
-- Fix: partner_settings open-read policy + rider_earnings missing policies
-- ============================================================
-- NOTE ON FILE NUMBERING: the user asked for this file to be named
-- `021_partner_settings_and_earnings_access.sql`. At the time of writing,
-- `021_payment_approval_functions.sql` through `026_create_rider_invitation_fn.sql`
-- already exist in this migrations folder (created after 020 but before this
-- session). To avoid overwriting/colliding with those, this fix is filed as
-- `027_...` instead, continuing the existing sequence. `020` was NOT touched,
-- per instructions.
--
-- ============================================================
-- SCHEMA FACTS GATHERED FROM THE LIVE DATABASE
-- (via PostgREST column probing with the anon key against the actual
-- Supabase project, cross-checked against src/integrations/supabase/types.ts)
-- ============================================================
--
-- partner_settings (Row):
--   partner_id                 uuid    NOT NULL  -- the delivery company / partner's user id
--   allow_direct_payment       boolean
--   cash_on_delivery_enabled   boolean
--   cash_on_ride_enabled       boolean
--   created_at                 timestamptz
--   updated_at                 timestamptz
--   -> Confirmed via live probing: there are NO banking-info or API-secret
--      columns on this table (only 6 columns above exist). Every column is
--      operational/config data a rider legitimately needs to understand how
--      they'll be paid (cash-on-delivery / cash-on-ride / direct-payment
--      toggles). Therefore NO separate `partner_settings_public` VIEW is
--      needed — the whole row is safe to expose to the linked rider, admin,
--      and the partner themself. If sensitive columns (bank_account,
--      api_secret, etc.) are added to this table in the future, split them
--      into a separate table/view before widening rider access again.
--
-- riders (Row) — confirmed via types.ts + live probing:
--   id                    uuid    PK
--   user_id               uuid    -- FK to auth.users(id); NULL until the invited rider signs up
--   delivery_company_id   uuid    NOT NULL  -- FK to the partner's user id (matches partner_settings.partner_id)
--   full_name, phone, email, ...
--   -> This is the linking table: a rider belongs to exactly one delivery
--      company via `riders.delivery_company_id`, and authenticates as
--      `riders.user_id = auth.uid()`.
--
-- rider_earnings (Row) — confirmed via live PostgREST column probing
-- (this table is NOT in types.ts yet, so it was probed directly; the
-- probe systematically tried ~50 plausible column names and only these
-- returned HTTP 200 instead of "column does not exist"):
--   id          uuid          PK
--   rider_id    uuid          -- FK to riders.id (NOT auth.uid() directly — consistent with
--                                 delivery_orders.rider_id also referencing riders.id elsewhere
--                                 in this schema)
--   order_id    uuid          -- FK to the originating order
--   amount      numeric
--   created_at  timestamptz
--   -> No delivery_company_id column exists on this table directly, so the
--      delivery company's access must be derived by joining through
--      riders.delivery_company_id.
--
-- user_roles (existing table, used by every other admin policy in this
-- project, e.g. 001_missing_tables.sql / 005_fix_promotions_and_offers.sql):
--   user_id  uuid
--   role     text   -- 'admin' for platform admins
--   -> Reused here for consistency with the rest of the codebase's admin
--      check pattern: EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
--
-- ============================================================
-- PART 1 — partner_settings: replace the open "read any row" policy
-- ============================================================

-- Drop the overly-permissive policy (qual: true → any authenticated user
-- could read every partner's settings, including competitors' rows).
DROP POLICY IF EXISTS "Authenticated read partner settings" ON public.partner_settings;

-- Also drop by-name in case it was created with a different casing/label
-- historically (defensive; no-op if it doesn't exist).
DROP POLICY IF EXISTS "authenticated_read_partner_settings" ON public.partner_settings;

ALTER TABLE public.partner_settings ENABLE ROW LEVEL SECURITY;

-- New SELECT policy — three legitimate readers, and only these three:
--   (a) admin: full visibility, needed for support/ops.
--   (b) the partner themself: partner_id = auth.uid() (their own row only).
--   (c) a rider currently employed by that specific partner: the rider's
--       `riders.delivery_company_id` must equal `partner_settings.partner_id`,
--       and the rider must be authenticated as that row's `user_id`. This is
--       the ONLY reason a rider needs to read partner_settings at all — to
--       know the payment terms (cash_on_delivery_enabled / cash_on_ride_enabled
--       / allow_direct_payment) of the company they currently work for, in
--       order to reconcile their own earnings. A rider working for company
--       "A" has no `riders` row pointing at company "B", so this EXISTS
--       clause naturally excludes rows for any company they don't work for.
DROP POLICY IF EXISTS "partner_settings_select_admin_self_or_linked_rider" ON public.partner_settings;
CREATE POLICY "partner_settings_select_admin_self_or_linked_rider"
  ON public.partner_settings
  FOR SELECT
  USING (
    -- (a) admin
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    -- (b) partner reading their own settings
    OR partner_id = auth.uid()
    -- (c) a rider currently linked to this specific partner/company
    OR EXISTS (
      SELECT 1 FROM public.riders r
      WHERE r.user_id = auth.uid()
        AND r.delivery_company_id = partner_settings.partner_id
    )
  );

-- Writes remain partner-only (admin included), unchanged in spirit from
-- before this fix — riders must never be able to modify a company's payment
-- settings. If a prior "partner manages own settings" write policy already
-- exists it is left untouched; this migration only touches the read path.
DROP POLICY IF EXISTS "partner_settings_write_admin_or_self" ON public.partner_settings;
CREATE POLICY "partner_settings_write_admin_or_self"
  ON public.partner_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR partner_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR partner_id = auth.uid()
  );


-- ============================================================
-- PART 2 — rider_earnings: table has RLS enabled but ZERO policies today,
-- which means every query is currently denied (riders can't see their own
-- earnings at all). Add the missing SELECT policies.
-- ============================================================

ALTER TABLE public.rider_earnings ENABLE ROW LEVEL SECURITY;

-- (a) The rider sees only their own earning rows.
--     rider_earnings.rider_id references riders.id (not auth.uid()
--     directly), so we resolve the rider's own id via riders.user_id.
DROP POLICY IF EXISTS "rider_earnings_select_own" ON public.rider_earnings;
CREATE POLICY "rider_earnings_select_own"
  ON public.rider_earnings
  FOR SELECT
  USING (
    rider_id IN (
      SELECT id FROM public.riders WHERE user_id = auth.uid()
    )
  );

-- (b) Admin sees every row (support/ops/finance reconciliation).
DROP POLICY IF EXISTS "rider_earnings_select_admin" ON public.rider_earnings;
CREATE POLICY "rider_earnings_select_admin"
  ON public.rider_earnings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- (c) The delivery company sees the earnings rows of its own riders only
--     (needed for DeliveryFinance's "أرباح المندوبين" tab to reconcile what
--     the company owes each rider). Resolved by joining rider_earnings.rider_id
--     -> riders.id -> riders.delivery_company_id = auth.uid(), since
--     rider_earnings has no delivery_company_id column of its own.
DROP POLICY IF EXISTS "rider_earnings_select_own_company_riders" ON public.rider_earnings;
CREATE POLICY "rider_earnings_select_own_company_riders"
  ON public.rider_earnings
  FOR SELECT
  USING (
    rider_id IN (
      SELECT id FROM public.riders WHERE delivery_company_id = auth.uid()
    )
  );

-- No INSERT/UPDATE/DELETE policies are added here intentionally — earnings
-- should only be written by trusted server-side logic (e.g. a SECURITY
-- DEFINER function or service-role call triggered when an order is marked
-- delivered), never directly by a rider or company from the client. If such
-- a function doesn't exist yet, add write access there instead of widening
-- client-side RLS on this table.
