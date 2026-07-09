-- ============================================================
-- RLS Audit & Consolidation
-- Generated after a live audit of Supabase RLS policies (pg_policies)
-- against the schema in `supabase/migrations/`.
--
-- This migration does NOT modify or remove any prior migration file.
-- It only adds/drops POLICIES (a normal, additive schema change) to
-- close gaps found during the audit. See the accompanying report
-- (rls_audit_report.md) for full findings.
--
-- Scope:
--   1. financial_transactions -> service_role ONLY (explicit request).
--      All client-side (anon/authenticated) access removed. The app
--      must read/write this table exclusively through backend code
--      using the Supabase service role key.
--   2. Critical over-permissive policies on other sensitive tables
--      that were found granting broad read/write access to any
--      authenticated (or even anonymous) user are removed.
-- ============================================================

-- ------------------------------------------------------------
-- 1. financial_transactions: lock to service_role only
-- ------------------------------------------------------------
-- Existing policies found live:
--   "Admins full access financial_transactions"   (ALL,   admin role)
--   "Admins manage financial_transactions"        (ALL,   admin role, duplicate)
--   "Partners view own financial_transactions"    (SELECT, partner_id = auth.uid())
--   "Users view own financial_transactions"       (SELECT, customer_id/partner_id = auth.uid())
--
-- All of these run under the "authenticated"/"public" Postgres role, which
-- means any signed-in user (or admin-flagged user) could read/write this
-- table directly via the Supabase client. Per explicit instruction, this
-- table must only be reachable by the service_role key (backend only).

DROP POLICY IF EXISTS "Admins full access financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Admins manage financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Partners view own financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Users view own financial_transactions" ON public.financial_transactions;

-- Belt-and-suspenders: force RLS even for the table owner, and make sure
-- no default grants leak through to anon/authenticated Postgres roles.
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.financial_transactions FROM anon, authenticated;

-- No policies are created for anon/authenticated: with RLS enabled and
-- zero policies, those roles get zero rows and zero writes. service_role
-- bypasses RLS entirely (Supabase default), so backend code using the
-- service role key continues to work unaffected.

-- ------------------------------------------------------------
-- 2. partner_bank_accounts: remove blanket read-all-bank-accounts policy
-- ------------------------------------------------------------
-- "Authenticated users can view partner bank accounts" allowed ANY signed-in
-- user to SELECT every partner's bank account/IBAN details. This is a
-- critical financial data leak. The self-service policy
-- "Partners manage own bank accounts" (partner_id = auth.uid()) already
-- covers legitimate partner access, and admins retain full access.

DROP POLICY IF EXISTS "Authenticated users can view partner bank accounts" ON public.partner_bank_accounts;

-- ------------------------------------------------------------
-- 3. platform_bank_accounts: remove blanket authenticated-read policy
-- ------------------------------------------------------------
-- "Authenticated view platform bank accounts" exposed the platform's own
-- bank account details to every signed-in user. Only admins (and
-- service_role backend code) should ever see these.

DROP POLICY IF EXISTS "Authenticated view platform bank accounts" ON public.platform_bank_accounts;

-- ------------------------------------------------------------
-- 4. admin_settings: remove blanket authenticated-read policy
-- ------------------------------------------------------------
-- "Authenticated users can read settings" let any signed-in user read the
-- entire admin_settings table. Admin-only access remains via the existing
-- admin-role policies.

DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.admin_settings;

-- ------------------------------------------------------------
-- 5. invitation_tokens: remove policies that leak/allow tampering with
--    ALL invite tokens regardless of ownership
-- ------------------------------------------------------------
-- "anon_read_invite_tokens" (roles: anon, authenticated / qual: true) let
-- literally anyone, including unauthenticated visitors, read every
-- invitation token row -- defeating the purpose of invite-only tokens.
-- "auth_update_invite_tokens" (qual: true / with_check: true) let any
-- authenticated user update ANY invitation token, including ones they did
-- not create (e.g. mark another company's invite as used, or hijack it).
--
-- Legitimate token redemption is already covered by
-- "anon_can_read_valid_token" (scoped to unused, non-expired tokens), and
-- legitimate owner updates are covered by "Companies can update their
-- invitations" (created_by = auth.uid() OR admin).

DROP POLICY IF EXISTS "anon_read_invite_tokens" ON public.invitation_tokens;
DROP POLICY IF EXISTS "auth_update_invite_tokens" ON public.invitation_tokens;
