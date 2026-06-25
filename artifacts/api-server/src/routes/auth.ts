import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://xugjqhxfdjlndljogvru.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── POST /api/auth/confirm-email ─────────────────────────────────────────────
// Confirms a user's email using the service-role admin API so they can sign in
// immediately after invitation-based registration (without waiting for email link).
//
// Body: { userId: string }
// Returns: { success: true } | { error: string }
router.post("/auth/confirm-email", async (req, res) => {
  const { userId } = req.body ?? {};

  if (!userId) {
    return res.status(400).json({ error: "userId مطلوب" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "الخدمة غير مهيأة (SUPABASE_SERVICE_ROLE_KEY مفقود)" });
  }

  const supabase = adminClient();

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    return res.status(500).json({ error: `فشل تأكيد البريد الإلكتروني: ${error.message}` });
  }

  return res.json({ success: true });
});

export default router;
