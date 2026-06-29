import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Inlined calculateCommission ──────────────────────────────────────────────
// (Cannot dynamically import cross-package from a Vercel serverless function)
async function calculateCommission(
  supabase: any,
  amount: number,
  type: "delivery",
  partnerId: string
): Promise<{ commission: number; earning: number }> {
  // Priority 1: Active subscription plan commission override
  const { data: sub } = await (supabase as any)
    .from("partner_subscriptions")
    .select("*, subscription_plans(commission_override_type, commission_override_value)")
    .eq("partner_id", partnerId)
    .eq("status", "active")
    .gte("current_period_end", new Date().toISOString())
    .maybeSingle();

  const plan = sub?.subscription_plans;
  if (plan?.commission_override_type) {
    const commission =
      plan.commission_override_type === "percentage"
        ? (amount * Number(plan.commission_override_value)) / 100
        : Number(plan.commission_override_value);
    return {
      commission: Math.round(commission * 100) / 100,
      earning: Math.round((amount - commission) * 100) / 100,
    };
  }

  // Priority 2: Manual per-partner override
  const { data: override } = await supabase
    .from("partner_commission_settings")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("override_global", true)
    .maybeSingle();

  if (override) {
    const commission =
      (override as any).commission_type === "percentage"
        ? (amount * Number((override as any).commission_value)) / 100
        : Number((override as any).commission_value);
    return {
      commission: Math.round(commission * 100) / 100,
      earning: Math.round((amount - commission) * 100) / 100,
    };
  }

  // Priority 3: Global accounting settings
  const { data: settings } = await supabase
    .from("accounting_settings")
    .select("global_commission_delivery")
    .eq("id", 1)
    .maybeSingle();

  const rate = Number((settings as any)?.global_commission_delivery ?? 10);
  const commission = (amount * rate) / 100;
  return {
    commission: Math.round(commission * 100) / 100,
    earning: Math.round((amount - commission) * 100) / 100,
  };
}
// ────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.APP_ORIGIN ?? "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!SERVICE_ROLE_KEY)
    return res.status(503).json({ error: "الخدمة غير مهيأة" });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Verify caller identity from their auth token
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "يجب تسجيل الدخول" });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user)
    return res.status(401).json({ error: "جلسة غير صالحة" });
  const authenticatedUserId = userData.user.id;

  const {
    restaurant_id,
    delivery_company_id,
    customer_name,
    customer_phone,
    customer_address,
    delivery_lat,
    delivery_lng,
    items, // [{ id: menu_item_id, quantity }]
    delivery_fee,
    tax,
    payment_method,
    notes,
    restaurant_delivery_subsidy,
    applied_offer_id,
    applied_offer_type,
    applied_offer_title,
  } = req.body ?? {};

  if (
    !restaurant_id ||
    !delivery_company_id ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
  }

  // 2. Authoritatively recompute subtotal from REAL menu_items prices
  const itemIds = items.map((i: any) => i.id);
  const { data: realItems, error: itemsErr } = await supabase
    .from("menu_items")
    .select("id, name_ar, name_en, price, discounted_price, is_available, restaurant_id")
    .in("id", itemIds);

  if (itemsErr || !realItems || realItems.length !== itemIds.length) {
    return res
      .status(400)
      .json({ error: "أحد العناصر في الطلب غير موجود" });
  }

  let subtotal = 0;
  const enrichedItems: any[] = [];
  for (const reqItem of items) {
    const real = (realItems as any[]).find((r: any) => r.id === reqItem.id);
    if (!real)
      return res.status(400).json({ error: "عنصر غير صالح في الطلب" });
    if (real.restaurant_id !== restaurant_id) {
      return res
        .status(400)
        .json({ error: "عناصر الطلب لا تنتمي لهذا المطعم" });
    }
    if (real.is_available === false) {
      return res
        .status(400)
        .json({ error: "أحد العناصر غير متوفر حالياً" });
    }
    const qty = Number(reqItem.quantity) || 0;
    if (qty <= 0 || qty > 50)
      return res.status(400).json({ error: "كمية غير صالحة" });
    const unitPrice = Number(real.discounted_price ?? real.price);
    subtotal += unitPrice * qty;
    // Build enriched item with name + price for display in order management
    enrichedItems.push({
      id: reqItem.id,
      name_ar: real.name_ar || real.name_en || "",
      name: real.name_en || real.name_ar || "",
      quantity: qty,
      price: unitPrice,
      selectedOptions: reqItem.selectedOptions || {},
      notes: reqItem.notes || "",
    });
  }

  // 3. Sanity-check delivery_fee / tax
  const safeDeliveryFee = Math.max(0, Number(delivery_fee) || 0);
  const safeTax = Math.max(0, Number(tax) || 0);
  const total = subtotal + safeDeliveryFee + safeTax;

  // 4. Insert the order using the service role (bypasses RLS)
  const orderInsert: any = {
    customer_id: authenticatedUserId,
    restaurant_id,
    delivery_company_id,
    customer_name,
    customer_phone,
    customer_address,
    delivery_lat,
    delivery_lng,
    items: enrichedItems,
    subtotal,
    delivery_fee: safeDeliveryFee,
    tax: safeTax,
    total,
    payment_method,
    status: "pending",
    payment_status: "pending",
    order_type: "restaurant",
    restaurant_delivery_subsidy: restaurant_delivery_subsidy ?? 0,
  };
  if (notes) orderInsert.notes = notes;
  if (applied_offer_id) {
    orderInsert.applied_offer_id = applied_offer_id;
    orderInsert.applied_offer_type = applied_offer_type;
    orderInsert.applied_offer_title = applied_offer_title;
  }

  const { data: orderRows, error: orderErr } = await supabase
    .from("delivery_orders")
    .insert(orderInsert)
    .select()
    .limit(1);

  if (orderErr || !orderRows?.[0]) {
    return res
      .status(500)
      .json({ error: "فشل إنشاء الطلب", details: orderErr?.message });
  }
  const order = orderRows[0];

  // 5. Create the financial_transactions split (server-trusted)
  try {
    const subsidy = Number(restaurant_delivery_subsidy) || 0;
    const deliveryRevenueBase = safeDeliveryFee + subsidy;

    const { commission: platformCommission, earning: companyDeliveryEarning } =
      await calculateCommission(
        supabase,
        deliveryRevenueBase,
        "delivery",
        delivery_company_id
      );

    const { data: restRow } = await supabase
      .from("restaurants")
      .select("commission_rate, name_ar")
      .eq("id", restaurant_id)
      .maybeSingle();

    const restCommissionRate = Number((restRow as any)?.commission_rate ?? 0);
    const restCommissionCut = Math.floor(subtotal * restCommissionRate / 100);
    const restaurantNetEarning = subtotal - restCommissionCut - subsidy;

    const { data: companyRow } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("user_id", delivery_company_id)
      .maybeSingle();

    await supabase.from("financial_transactions").insert({
      reference_id: order.id,
      order_id: order.id,
      transaction_type: "delivery_order",
      partner_type: "delivery_company",
      customer_id: authenticatedUserId,
      partner_id: delivery_company_id,
      partner_name: (companyRow as any)?.company_name ?? null,
      amount: deliveryRevenueBase,
      platform_commission: platformCommission,
      partner_earning: companyDeliveryEarning,
      payment_method,
      payment_status: "pending",
      notes: `عمولة توصيل — طلب ${order.id}`,
    });

    await supabase.from("financial_transactions").insert({
      reference_id: order.id,
      order_id: order.id,
      transaction_type: "restaurant_order",
      partner_type: "restaurant",
      customer_id: authenticatedUserId,
      partner_id: restaurant_id,
      partner_name: (restRow as any)?.name_ar ?? null,
      amount: subtotal,
      platform_commission: 0,
      partner_earning: restaurantNetEarning,
      payment_method,
      payment_status: "pending",
      notes: `صافي إيرادات الطعام — طلب ${order.id} (عمولة شركة التوصيل: ${restCommissionCut} ر.ي)`,
    });
  } catch (finErr) {
    console.error("Financial transaction split failed:", finErr);
  }

  return res.status(200).json({ success: true, order });
}
