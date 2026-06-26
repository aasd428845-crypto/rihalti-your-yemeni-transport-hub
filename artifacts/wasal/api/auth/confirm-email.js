// Vercel Serverless Function — confirms a user's email via Supabase Admin API
// Called from InvitePage after signUp() so the user can signInWithPassword immediately.
// Uses native fetch (Node.js 18+) — no npm packages required.

const SUPABASE_URL = process.env.SUPABASE_URL || "https://xugjqhxfdjlndljogvru.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "userId مطلوب" });

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY غير مهيأ في Vercel" });
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "apikey": SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ email_confirm: true }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(500).json({ error: `فشل تأكيد البريد: ${err}` });
  }

  return res.status(200).json({ success: true });
};
