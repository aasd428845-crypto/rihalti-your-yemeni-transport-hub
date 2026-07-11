import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Inlined haversine + fee calc (cannot import cross-package in Vercel) ──────
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcServerDeliveryFee(
  restaurantLat: number, restaurantLng: number,
  customerLat: number, customerLng: number,
  pricePerKm: number,
  minFee = 0
): { fee: number; distanceKm: number } {
  const distanceKm = haversineDistance(restaurantLat, restaurantLng, customerLat, customerLng);
  const fee = Math.max(minFee, Math.ceil(distanceKm * pricePerKm));
  return { fee, distanceKm };
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Offer validity check (mirrors isOfferCurrentlyActive on the client) ───────
function isOfferCurrentlyActive(offer: Record<string, unknown>): boolean {
  const now = new Date();
  const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const todayName = ARABIC_DAYS[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (!offer.is_active) return false;
  if (offer.starts_at && new Date(offer.starts_at as string) > now) return false;
  if (offer.ends_at   && new Date(offer.ends_at   as string) < now) return false;
  if (Array.isArray(offer.active_days) && offer.active_days.length && !offer.active_days.includes(todayName)) return false;
  if (offer.start_time && currentTime < (offer.start_time as string)) return false;
  if (offer.end_time   && currentTime > (offer.end_time   as string)) return false;
  return true;
}

// Apply delivery-fee offer discount (mirrors buildFeeDiscount on the client)
function applyOfferToDeliveryFee(fee: number, offer: Record<string, unknown>): number {
  const t = offer.offer_type as string;
  if (t === "free_delivery") return 0;
  if (t === "percent_off_delivery") {
    const pct = Number(offer.discount_percent ?? 0);
    return Math.max(0, Math.round(fee * (1 - pct / 100)));
  }
  if (t === "fixed_off_delivery") {
    return Math.max(0, fee - Number(offer.discount_amount ?? 0));
  }
  return fee; // order-level or custom offers don't affect delivery fee
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Inlined calculateCommission ──────────────────────────────────────────────
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
    // delivery_fee & restaurant_delivery_subsidy from client are intentionally
    // NOT trusted — we recompute both server-side below.
    tax,
    payment_method,
    notes,
    applied_offer_id,
    // applied_offer_type / applied_offer_title from client are not trusted either;
    // we re-verify the offer from the DB.
  } = req.body ?? {};

  if (
    !restaurant_id ||
    !delivery_company_id ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
  }

  // 2. Authoritatively recompute subtotal from REAL menu_items prices +
  //    fetch restaurant data (lat, lng, price_per_km, commission_rate) in parallel.
  const itemIds = items.map((i: any) => i.id);
  const [
    { data: realItems, error: itemsErr },
    { data: restaurantRow },
    { data: partnerSettingsRow },
  ] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id, name_ar, name_en, price, discounted_price, is_available, restaurant_id")
      .in("id", itemIds),
    supabase
      .from("restaurants")
      .select("latitude, longitude, price_per_km, commission_rate, name_ar, delivery_company_id")
      .eq("id", restaurant_id)
      .maybeSingle(),
    supabase
      .from("partner_settings" as any)
      .select("price_per_km, min_delivery_fee")
      .eq("partner_id", delivery_company_id)
      .maybeSingle(),
  ]);

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

  // 3. Compute delivery fee server-side
  //    Priority: restaurant.price_per_km (if > 0) → partner_settings.price_per_km → 0
  const restRow = restaurantRow as Record<string, unknown> | null;
  const settingsRow = partnerSettingsRow as Record<string, unknown> | null;

  const restaurantPricePerKm = Number(restRow?.price_per_km ?? 0);
  const companyPricePerKm    = Number(settingsRow?.price_per_km ?? 0);
  const effectivePricePerKm  = restaurantPricePerKm > 0 ? restaurantPricePerKm : companyPricePerKm;
  const minDeliveryFee       = Number(settingsRow?.min_delivery_fee ?? 0);

  const restLat   = restRow?.latitude   != null ? Number(restRow.latitude)   : null;
  const restLng   = restRow?.longitude  != null ? Number(restRow.longitude)  : null;
  const custLat   = delivery_lat  != null ? Number(delivery_lat)  : null;
  const custLng   = delivery_lng  != null ? Number(delivery_lng)  : null;
  const canCompute =
    effectivePricePerKm > 0 &&
    restLat !== null && restLng !== null &&
    custLat !== null && custLng !== null;

  let rawDeliveryFee = 0;
  if (canCompute) {
    rawDeliveryFee = calcServerDeliveryFee(
      restLat!, restLng!, custLat!, custLng!,
      effectivePricePerKm, minDeliveryFee
    ).fee;
  }

  // 4. Verify and apply offer server-side — ignore any offer data from client
  let serverDeliveryFee = rawDeliveryFee;
  let verifiedOfferType: string | null = null;
  let verifiedOfferTitle: string | null = null;
  let verifiedOfferId: string | null = null;

  if (applied_offer_id) {
    const { data: offerRow } = await supabase
      .from("delivery_company_offers" as any)
      .select("*")
      .eq("id", applied_offer_id)
      .eq("delivery_company_id", delivery_company_id)
      .eq("is_active", true)
      .maybeSingle();

    const offer = offerRow as Record<string, unknown> | null;
    if (offer && isOfferCurrentlyActive(offer)) {
      // Check minimum order amount against server-computed subtotal
      const minOrder = Number(offer.min_order_amount ?? 0);
      if (minOrder === 0 || subtotal >= minOrder) {
        serverDeliveryFee = applyOfferToDeliveryFee(rawDeliveryFee, offer);
        verifiedOfferType  = offer.offer_type  as string;
        verifiedOfferTitle = (offer.title ?? null) as string | null;
        verifiedOfferId    = applied_offer_id;
      }
    }
  }

  // 5. Compute restaurant_delivery_subsidy server-side:
  //    When the offer is restaurant-sponsored, the restaurant owes the gap
  //    between the raw fee and the discounted fee.
  //    For non-restaurant sponsors (external/platform) the subsidy is 0.
  let serverSubsidy = 0;
  if (verifiedOfferId) {
    const { data: offerForSubsidy } = await supabase
      .from("delivery_company_offers" as any)
      .select("sponsor_type")
      .eq("id", verifiedOfferId)
      .maybeSingle();
    const sponsorType = (offerForSubsidy as Record<string, unknown> | null)?.sponsor_type as string | null;
    const restaurantIsResponsible = !sponsorType || sponsorType === "restaurant";
    if (restaurantIsResponsible) {
      serverSubsidy = Math.max(0, rawDeliveryFee - serverDeliveryFee);
    }
  }

  const safeTax = Math.max(0, Number(tax) || 0);
  const total = subtotal + serverDeliveryFee + safeTax;

  // 6. Insert the order using the service role (bypasses RLS)
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
    delivery_fee: serverDeliveryFee,
    tax: safeTax,
    total,
    payment_method,
    status: "pending",
    payment_status: "pending",
    order_type: "restaurant",
    restaurant_delivery_subsidy: serverSubsidy,
  };
  if (notes) orderInsert.notes = notes;
  if (verifiedOfferId) {
    orderInsert.applied_offer_id    = verifiedOfferId;
    orderInsert.applied_offer_type  = verifiedOfferType;
    orderInsert.applied_offer_title = verifiedOfferTitle;
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

  // 7. Create the financial_transactions split (server-trusted)
  try {
    const deliveryRevenueBase = serverDeliveryFee + serverSubsidy;

    const { commission: platformCommission, earning: companyDeliveryEarning } =
      await calculateCommission(
        supabase,
        deliveryRevenueBase,
        "delivery",
        delivery_company_id
      );

    // restRow already fetched above — reuse it (commission_rate, name_ar)
    const restCommissionRate = Number(restRow?.commission_rate ?? 0);
    const restCommissionCut  = Math.floor(subtotal * restCommissionRate / 100);
    const restaurantNetEarning = subtotal - restCommissionCut - serverSubsidy;

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
      partner_name: restRow?.name_ar as string ?? null,
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
