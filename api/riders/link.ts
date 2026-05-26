import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://hhqhoqwpebnmfuhwhllw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// POST /api/riders/link
// Runs with service-role key → bypasses RLS entirely.
// Called from InvitePage after delivery_driver registration and from
// DeliveryDriverDashboard as a fallback when user_id lookup fails.
//
// Body: { email, userId, fullName?, phone?, vehicleType?, vehiclePlate?, companyId? }
// Returns: { success, rider, action }
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, userId, fullName, phone, vehicleType, vehiclePlate, companyId } =
    req.body ?? {};

  if (!email || !userId) {
    return res.status(400).json({ error: "email و userId مطلوبان" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({
      error:
        "خدمة الربط غير مهيأة. يرجى إضافة SUPABASE_SERVICE_ROLE_KEY في إعدادات Vercel (Environment Variables).",
    });
  }

  const supabase = adminClient();

  // Build update payload
  const updatePayload: Record<string, any> = {
    user_id: userId,
    is_active: true,
    is_approved: true,
  };
  if (fullName)      updatePayload.full_name     = fullName;
  if (phone)         updatePayload.phone          = phone;
  if (vehicleType)   updatePayload.vehicle_type   = vehicleType;
  if (vehiclePlate)  updatePayload.vehicle_plate  = vehiclePlate;

  // 1. Find placeholder row by email (case-insensitive), user_id IS NULL
  let query = supabase
    .from("riders")
    .select("id, delivery_company_id, email, user_id")
    .ilike("email", email)
    .is("user_id", null);

  if (companyId) query = query.eq("delivery_company_id", companyId);

  const { data: candidates } = await query;
  const targetId = candidates?.[0]?.id ?? null;

  if (targetId) {
    const { data: updated, error } = await supabase
      .from("riders")
      .update(updatePayload)
      .eq("id", targetId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: `فشل تحديث سجل المندوب: ${error.message}` });
    }
    return res.status(200).json({ success: true, rider: updated, action: "updated" });
  }

  // 2. Already linked?
  const { data: alreadyLinked } = await supabase
    .from("riders")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (alreadyLinked) {
    return res.status(200).json({ success: true, rider: alreadyLinked, action: "already_linked" });
  }

  // 3. No placeholder → create a fresh rider row
  const insertPayload: Record<string, any> = { ...updatePayload, email };
  if (companyId) insertPayload.delivery_company_id = companyId;

  const { data: inserted, error: insertErr } = await supabase
    .from("riders")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr) {
    return res.status(500).json({ error: `فشل إنشاء سجل المندوب: ${insertErr.message}` });
  }

  return res.status(200).json({ success: true, rider: inserted, action: "created" });
}
