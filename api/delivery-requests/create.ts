import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// ── Haversine distance (km) ───────────────────────────────────────────────────
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

function calcDeliveryFee(
  pickupLat: number, pickupLng: number,
  dropLat: number, dropLng: number,
  pricePerKm: number, minFee: number
): { fee: number; distanceKm: number } {
  const distanceKm = haversineDistance(pickupLat, pickupLng, dropLat, dropLng);
  const fee = Math.max(minFee, Math.ceil(distanceKm * pricePerKm));
  return { fee, distanceKm };
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Offer validity — mirrors isOfferCurrentlyActive on the client ─────────────
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

// ── Apply shipment-offer discount to fee ──────────────────────────────────────
function applyOfferDiscount(fee: number, offer: Record<string, unknown>): number {
  const t = offer.offer_type as string;
  if (t === "free_delivery") return 0;
  if (t === "percent_off_delivery") {
    const pct = Number(offer.discount_percent ?? 0);
    return Math.max(0, Math.round(fee * (1 - pct / 100)));
  }
  if (t === "fixed_off_delivery") {
    return Math.max(0, fee - Number(offer.discount_amount ?? 0));
  }
  return fee;
}
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_ORIGIN ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!SERVICE_ROLE_KEY)
    return res.status(503).json({ error: "الخدمة غير مهيأة (SUPABASE_SERVICE_ROLE_KEY مفقود)" });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Auth — verify the bearer token
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "مطلوب تسجيل الدخول" });

  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user)
    return res.status(401).json({ error: "جلسة غير صالحة، يرجى تسجيل الدخول مجدداً" });

  // 2. Parse non-price fields from body
  const {
    delivery_company_id,
    customer_name,
    customer_phone,
    customer_address,
    delivery_lat,
    delivery_lng,
    pickup_address,
    pickup_lat,
    pickup_lng,
    service_type,
    item_size,
    item_description,
    image_url,
    notes,
    sender_name,
    sender_phone,
    recipient_name,
    recipient_phone,
    item_weight,
    item_dimensions,
    payment_method,
    applied_offer_id,
  } = (req.body ?? {}) as Record<string, unknown>;

  if (!delivery_company_id)
    return res.status(400).json({ error: "delivery_company_id مطلوب" });

  // 3. Fetch real pricing from partner_settings (service_role bypasses RLS)
  const { data: settings } = await sb
    .from("partner_settings" as never)
    .select("price_per_km, min_delivery_fee")
    .eq("partner_id", delivery_company_id)
    .maybeSingle();

  const pricePerKm = Number((settings as Record<string, unknown> | null)?.price_per_km ?? 0);
  const minFee     = Number((settings as Record<string, unknown> | null)?.min_delivery_fee ?? 0);

  // 4. Determine awaitingPricing — true when coordinates missing or company has no pricing
  const pLat = pickup_lat  != null ? Number(pickup_lat)  : 0;
  const pLng = pickup_lng  != null ? Number(pickup_lng)  : 0;
  const dLat = delivery_lat != null ? Number(delivery_lat) : 0;
  const dLng = delivery_lng != null ? Number(delivery_lng) : 0;
  const hasCoordinates = pLat !== 0 && pLng !== 0 && dLat !== 0 && dLng !== 0;
  const awaitingPricing = !hasCoordinates || pricePerKm === 0;

  // 5. Compute fee server-side (ignored when awaitingPricing)
  let computedFee = 0;
  let finalFee = 0;
  let distanceKm: number | null = null;
  let appliedOfferType: string | null = null;

  if (!awaitingPricing) {
    const calc = calcDeliveryFee(pLat, pLng, dLat, dLng, pricePerKm, minFee);
    computedFee = calc.fee;
    distanceKm  = calc.distanceKm;
    finalFee    = computedFee;

    // 6. Verify and apply offer server-side (ignore any price value sent by client)
    if (applied_offer_id) {
      const { data: offer } = await sb
        .from("delivery_company_offers" as never)
        .select("*")
        .eq("id", applied_offer_id)
        .eq("delivery_company_id", delivery_company_id)
        .eq("is_active", true)
        .maybeSingle();

      const offerRecord = offer as Record<string, unknown> | null;
      const isShipmentOffer = offerRecord?.scope === "shipment" || !offerRecord?.scope;

      if (offerRecord && isOfferCurrentlyActive(offerRecord) && isShipmentOffer) {
        finalFee         = applyOfferDiscount(computedFee, offerRecord);
        appliedOfferType = offerRecord.offer_type as string;
      }
    }
  }

  // 7. Build items JSON — rich metadata for the delivery company dashboard
  const orderItems = [
    {
      name_ar:         `${service_type || "توصيل"} — ${item_size || "متوسط"}`,
      name:            service_type || "parcel",
      quantity:        1,
      price:           finalFee,
      order_type:      "delivery_request",
      service_type:    service_type    || null,
      item_size:       item_size       || null,
      item_description: item_description || "",
      image_url:       image_url       || "",
      notes:           notes           || "",
      pickup_address:  pickup_address  || "",
      pickup_lat:      pLat || null,
      pickup_lng:      pLng || null,
      sender_name:     sender_name     || customer_name || "",
      sender_phone:    sender_phone    || customer_phone || "",
      recipient_name:  recipient_name  || "",
      recipient_phone: recipient_phone || "",
      item_weight:     item_weight     || "",
      item_dimensions: item_dimensions || "",
      offer_applied:   appliedOfferType || null,
      price_per_km:    pricePerKm,
      distance_km:     distanceKm != null ? Number(distanceKm.toFixed(2)) : null,
      awaiting_pricing: awaitingPricing,
    },
  ];

  // 8. Insert into delivery_orders using service_role key (bypasses RLS)
  const insertPayload: Record<string, unknown> = {
    delivery_company_id,
    customer_id:      user.id,
    customer_name:    customer_name    || "",
    customer_phone:   customer_phone   || "",
    customer_address: customer_address || "",
    delivery_lat:     dLat || null,
    delivery_lng:     dLng || null,
    total:            finalFee,
    delivery_fee:     finalFee,
    payment_method:   awaitingPricing ? null : (payment_method || "cash"),
    payment_status:   "pending",
    status:           "pending",
    items:            orderItems,
    notes:            notes || null,
  };

  if (applied_offer_id && appliedOfferType) {
    insertPayload.applied_offer_id   = applied_offer_id;
    insertPayload.applied_offer_type = appliedOfferType;
  }

  const { data: order, error: insertErr } = await sb
    .from("delivery_orders")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr)
    return res.status(500).json({ error: `فشل إنشاء الطلب: ${insertErr.message}` });

  // 9. Notify the delivery company (non-fatal)
  try {
    await (sb.from as (t: string) => ReturnType<typeof sb.from>)("notifications").insert({
      user_id: delivery_company_id,
      title: awaitingPricing ? "💰 طلب تسعير جديد!" : "🚚 طلب توصيل جديد!",
      body: awaitingPricing
        ? `${customer_name || "عميل"} يطلب تسعير ${service_type || "توصيل"} من ${pickup_address || "موقع غير محدد"}`
        : `${customer_name || "عميل"} — ${service_type || "توصيل"} من ${pickup_address || ""}`,
      data: {
        type:     awaitingPricing ? "pricing_request" : "new_delivery_request",
        url:      awaitingPricing ? "/delivery/pricing" : "/delivery/orders",
        order_id: (order as Record<string, unknown>).id,
      },
      is_read: false,
    });
  } catch (_) {
    // Non-fatal — order was created successfully
  }

  return res.status(200).json({
    order,
    awaitingPricing,
    computedFee: finalFee,
    distanceKm: distanceKm != null ? Number(distanceKm.toFixed(2)) : null,
  });
}
