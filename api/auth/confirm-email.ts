import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// POST /api/auth/confirm-email
// Confirms a user's email via the Supabase Admin API so they can sign in
// immediately after invitation-based registration, without clicking an email link.
//
// Called from InvitePage.tsx after auto-approved role registration.
// Non-critical: the caller wraps this in try/catch and proceeds regardless.
//
// Body: { userId: string }
// Returns: { success: true } | { error: string }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_ORIGIN ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!SERVICE_ROLE_KEY)
    return res.status(503).json({ error: "الخدمة غير مهيأة (SUPABASE_SERVICE_ROLE_KEY مفقود)" });

  const { userId } = (req.body ?? {}) as { userId?: string };

  if (!userId)
    return res.status(400).json({ error: "userId مطلوب" });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await sb.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error)
    return res.status(500).json({ error: `فشل تأكيد البريد الإلكتروني: ${error.message}` });

  return res.status(200).json({ success: true });
}
