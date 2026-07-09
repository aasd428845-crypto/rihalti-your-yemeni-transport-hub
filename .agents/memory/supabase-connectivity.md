---
name: Supabase DB connectivity in this sandbox
description: Direct Postgres connection to Supabase fails here; use the connection pooler URL instead.
---

Direct Supabase Postgres connections (`db.<project-ref>.supabase.co:5432`) resolve to IPv6-only addresses, and this Replit sandbox has no outbound IPv6 support at the socket level (`EAFNOSUPPORT` even after manually resolving the AAAA record). REST API access (`SUPABASE_URL/rest/v1`) works fine — only raw Postgres port 5432 to the direct host fails.

**Fix:** use Supabase's Session Pooler connection string instead (Dashboard → Project Settings → Database → Connection Pooling → Session mode). Its host is `aws-<region>.pooler.supabase.com`, which is IPv4-reachable, with user format `postgres.<project-ref>`.

**How to apply:** when a task needs a direct `pg` client connection to a user's Supabase project from this environment, request the pooler URL (not the direct `db.*.supabase.co` URL) via `requestEnvVar` up front to save a debugging round-trip. Also remind the user to paste secrets only through the secure `requestEnvVar` prompt, not directly in chat — a value pasted in chat does not update the stored secret.
