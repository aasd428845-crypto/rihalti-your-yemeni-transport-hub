-- Table: notification_failures
-- Logs every failed push notification or in-app notification insert
-- so no silent delivery gap goes unnoticed.
-- The front-end writes to this table as a fire-and-forget fallback.

CREATE TABLE IF NOT EXISTS public.notification_failures (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL    DEFAULT now(),
  function_name text        NOT NULL,            -- e.g. "send-push-notification" | "notifications.insert"
  payload       jsonb,                           -- the body/payload that was attempted
  error_message text,                            -- error.message from the caught exception
  resolved      boolean     NOT NULL DEFAULT false
);

ALTER TABLE public.notification_failures ENABLE ROW LEVEL SECURITY;

-- Authenticated users (the delivery-company admins / driver apps) may INSERT failures.
-- Reading is restricted to service-role for now; an admin UI will be added later.
CREATE POLICY "authenticated_can_insert_notification_failures"
  ON public.notification_failures
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for the future admin UI (unresolved failures, newest first)
CREATE INDEX IF NOT EXISTS idx_notification_failures_unresolved
  ON public.notification_failures (created_at DESC)
  WHERE resolved = false;
