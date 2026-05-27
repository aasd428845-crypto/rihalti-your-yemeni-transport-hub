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

// ─── POST /api/riders/link ────────────────────────────────────────────────────
// Links a rider row to an auth user. Called from:
//   1. InvitePage after delivery_driver registration (bypasses RLS)
//   2. DeliveryDriverDashboard fallback when user_id lookup fails
//
// Body: { email, userId, fullName?, phone?, vehicleType?, vehiclePlate?, companyId? }
// Returns: { success, rider }
router.post("/riders/link", async (req, res) => {
  const { email, userId, fullName, phone, vehicleType, vehiclePlate, companyId } = req.body ?? {};

  if (!email || !userId) {
    return res.status(400).json({ error: "email و userId مطلوبان" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "خدمة الربط غير مهيأة (SUPABASE_SERVICE_ROLE_KEY مفقود)" });
  }

  const supabase = adminClient();

  // Build the update payload
  const updatePayload: Record<string, any> = {
    user_id: userId,
    is_active: true,
    is_approved: true,
  };
  if (fullName) updatePayload.full_name = fullName;
  if (phone)    updatePayload.phone     = phone;
  if (vehicleType)  updatePayload.vehicle_type  = vehicleType;
  if (vehiclePlate) updatePayload.vehicle_plate = vehiclePlate;

  // 1. Try to find existing placeholder by email (case-insensitive) in the right company
  let query = supabase
    .from("riders")
    .select("id, delivery_company_id, email, user_id")
    .ilike("email", email)
    .is("user_id", null);

  if (companyId) query = query.eq("delivery_company_id", companyId);

  const { data: candidates } = await query;

  let targetId: string | null = null;

  if (candidates && candidates.length > 0) {
    // Pick the most recent one
    targetId = candidates[0].id;
  }

  if (targetId) {
    // Update the existing placeholder
    const { data: updated, error } = await supabase
      .from("riders")
      .update(updatePayload)
      .eq("id", targetId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: `فشل تحديث سجل المندوب: ${error.message}` });
    }
    return res.json({ success: true, rider: updated, action: "updated" });
  }

  // 2. No placeholder found — check if there's already a linked row for this user
  const { data: alreadyLinked } = await supabase
    .from("riders")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (alreadyLinked) {
    return res.json({ success: true, rider: alreadyLinked, action: "already_linked" });
  }

  // 3. Create a fresh rider row
  const insertPayload: Record<string, any> = {
    ...updatePayload,
    email,
  };
  if (companyId) insertPayload.delivery_company_id = companyId;

  const { data: inserted, error: insertErr } = await supabase
    .from("riders")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr) {
    return res.status(500).json({ error: `فشل إنشاء سجل المندوب: ${insertErr.message}` });
  }

  return res.json({ success: true, rider: inserted, action: "created" });
});

// ─── GET /api/riders/by-user/:userId ─────────────────────────────────────────
// Fetches rider row by userId (used by dashboard as fallback via service role)
router.get("/riders/by-user/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "خدمة البحث غير مهيأة" });
  }

  const supabase = adminClient();

  const { data, error } = await supabase
    .from("riders")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ rider: data });
});

// ─── GET /api/riders/orders/:userId ──────────────────────────────────────────
// Fetches active delivery_orders assigned to a rider, bypassing RLS.
// Used by DeliveryDriverDashboard and DeliveryDriverOrders.
router.get("/riders/orders/:userId", async (req, res) => {
  const { userId } = req.params;
  const { completed } = req.query;

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "الخدمة غير مهيأة (SUPABASE_SERVICE_ROLE_KEY مفقود)" });
  }

  const supabase = adminClient();

  // 1. Find rider row for this auth user
  const { data: rider, error: riderErr } = await supabase
    .from("riders")
    .select("id, delivery_company_id, is_approved")
    .eq("user_id", userId)
    .maybeSingle();

  if (riderErr) return res.status(500).json({ error: riderErr.message });
  if (!rider)   return res.json({ orders: [], rider: null });

  // 2. Fetch their orders
  let query = supabase
    .from("delivery_orders")
    .select("*, restaurant:restaurants(name_ar, address, phone)")
    .eq("rider_id", rider.id);

  if (completed === "true") {
    query = query.in("status", ["delivered", "cancelled", "returned"]).order("delivered_at", { ascending: false }).limit(50);
  } else {
    query = query.not("status", "in", '("delivered","cancelled","returned")').order("assigned_at", { ascending: false }).limit(30);
  }

  const { data: orders, error: ordersErr } = await query;
  if (ordersErr) return res.status(500).json({ error: ordersErr.message });

  return res.json({ orders: orders || [], rider });
});

export default router;
