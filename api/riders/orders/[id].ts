import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_ORIGIN ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  if (!SERVICE_ROLE_KEY)
    return res.status(503).json({ error: "الخدمة غير مهيأة (SUPABASE_SERVICE_ROLE_KEY مفقود)" });

  // 1. Verify Bearer token — caller must be authenticated
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "مطلوب تسجيل الدخول" });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user)
    return res.status(401).json({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مجدداً" });

  // 2. Security — the authenticated user MUST match the requested [id].
  //    This prevents rider A from reading rider B's orders by changing the URL.
  const requestedId = req.query.id as string;
  if (user.id !== requestedId)
    return res.status(403).json({ error: "غير مصرح لك بعرض طلبات مندوب آخر" });

  // 3. Resolve the riders row for this auth user
  const { data: rider, error: riderErr } = await sb
    .from("riders")
    .select("id, delivery_company_id, is_approved, full_name, phone, vehicle_type, vehicle_plate")
    .eq("user_id", requestedId)
    .maybeSingle();

  if (riderErr) return res.status(500).json({ error: riderErr.message });
  if (!rider)   return res.status(200).json({ orders: [], rider: null });

  // 4. Fetch orders assigned to this rider's internal id
  const completed = req.query.completed === "true";

  let query = sb
    .from("delivery_orders")
    .select("*, restaurant:restaurants(name_ar, address, phone)")
    .eq("rider_id", rider.id);

  if (completed) {
    query = query
      .in("status", ["delivered", "cancelled", "returned"])
      .order("delivered_at", { ascending: false })
      .limit(50);
  } else {
    query = query
      .not("status", "in", '("delivered","cancelled","returned")')
      .order("assigned_at", { ascending: false })
      .limit(30);
  }

  const { data: orders, error: ordersErr } = await query;
  if (ordersErr) return res.status(500).json({ error: ordersErr.message });

  return res.status(200).json({ orders: orders || [], rider });
}
