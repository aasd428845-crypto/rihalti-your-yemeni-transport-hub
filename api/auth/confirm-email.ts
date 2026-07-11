import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// POST /api/auth/confirm-email
// Confirms a user's email via the Supabase Admin API so they can sign in
// immediately after invitation-based registration, without clicking an email link.
//
// SECURITY: requires a valid, unexpired, unused invitation token that was issued
// to the same email address as the userId being confirmed. Without this check
// any unauthenticated caller could confirm arbitrary users by guessing their userId.
//
// Body: { userId: string, token: string }
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

  const { userId, token } = (req.body ?? {}) as {
    userId?: string;
    token?: string;
  };

  if (!userId || !token)
    return res.status(400).json({ error: "userId و token مطلوبان" });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Fetch the invitation_tokens row for this token
  const { data: invite, error: inviteErr } = await sb
    .from("invitation_tokens")
    .select("email, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr)
    return res.status(500).json({ error: `خطأ في التحقق من التوكن: ${inviteErr.message}` });

  // (أ) الصف موجود
  if (!invite)
    return res.status(403).json({ error: "رمز الدعوة غير صالح" });

  // (ب) لم يُستخدم من قبل
  if (invite.used_at !== null)
    return res.status(403).json({ error: "رمز الدعوة مستخدم بالفعل" });

  // (ج) لم تنتهِ صلاحيته
  if (new Date(invite.expires_at) < new Date())
    return res.status(403).json({ error: "انتهت صلاحية رمز الدعوة" });

  // (د) بريد userId يطابق بريد صف التوكن
  const { data: userData, error: userErr } = await sb.auth.admin.getUserById(userId);
  if (userErr || !userData?.user)
    return res.status(403).json({ error: "لم يُعثر على المستخدم" });

  const userEmail = userData.user.email ?? "";
  const inviteEmail = invite.email ?? "";

  if (userEmail.toLowerCase() !== inviteEmail.toLowerCase())
    return res
      .status(403)
      .json({ error: "البريد الإلكتروني للمستخدم لا يطابق رمز الدعوة" });

  // جميع الشروط نجحت — أكّد البريد الإلكتروني
  const { error } = await sb.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error)
    return res.status(500).json({ error: `فشل تأكيد البريد الإلكتروني: ${error.message}` });

  return res.status(200).json({ success: true });
}
