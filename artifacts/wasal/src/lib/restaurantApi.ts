import { supabase } from "@/integrations/supabase/client";

// Coverage status for a restaurant relative to the customer's area
export type CoverageStatus = "full" | "covered" | "extra_fee" | "out_of_range";

export interface RestaurantWithCoverage {
  [key: string]: any;
  coverage_status: CoverageStatus;
  computed_delivery_fee: number;
}

// ===== Public Restaurant Queries =====

/**
 * Fetches active restaurants by city (big city, not neighborhood).
 * When customerArea is provided, enriches each result with:
 *   - coverage_status: 'full' | 'covered' | 'extra_fee' | 'out_of_range'
 *   - computed_delivery_fee: adjusted delivery fee for the customer's area
 *
 * Coverage rules:
 *   - coverage_areas empty   → 'full'       (serves entire city)
 *   - area in coverage_areas → 'covered'    (explicitly included)
 *   - area not covered but delivery zone exists → 'extra_fee' (fee = base + zone)
 *   - area not covered and no zone → 'out_of_range'
 */
export const getActiveRestaurants = async (
  city?: string,
  customerArea?: string
): Promise<RestaurantWithCoverage[]> => {
  let query = supabase
    .from("restaurants")
    .select("*")
    .eq("is_active", true)
    .order("rating", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Filter by city client-side so restaurants with no city set still appear everywhere
  const activeRestaurants = (city && city !== "all"
    ? data.filter((r: any) => !r.city || r.city === "" || r.city === city)
    : data) as any[];

  // If no customer area provided, return with 'full' coverage status
  if (!customerArea || customerArea.trim() === "") {
    return activeRestaurants.map((r) => ({
      ...r,
      coverage_status: "full" as CoverageStatus,
      computed_delivery_fee: r.delivery_fee ?? 0,
    }));
  }

  // Batch-load all delivery zones for all delivery companies in the result set
  const companyIds = [...new Set(activeRestaurants.map((r) => r.delivery_company_id).filter(Boolean))];
  if (companyIds.length === 0) {
    return activeRestaurants.map((r) => ({
      ...r,
      coverage_status: "out_of_range" as CoverageStatus,
      computed_delivery_fee: r.delivery_fee ?? 0,
    }));
  }
  const { data: allZones } = await (supabase
    .from("delivery_zones" as any)
    .select("*")
    .in("delivery_company_id", companyIds)
    .eq("is_active", true) as any);

  // Group zones by company for O(1) lookup
  const zonesByCompany: Record<string, any[]> = {};
  for (const z of allZones || []) {
    if (!zonesByCompany[z.delivery_company_id]) zonesByCompany[z.delivery_company_id] = [];
    zonesByCompany[z.delivery_company_id].push(z);
  }

  return activeRestaurants.map((r) => {
    const coverageAreas: string[] = r.coverage_areas || [];
    const companyZones: any[] = zonesByCompany[r.delivery_company_id] || [];
    const matchingZone = companyZones.find((z) => z.zone_name === customerArea);

    let coverage_status: CoverageStatus;
    let computed_delivery_fee = r.delivery_fee ?? 0;

    if (coverageAreas.length === 0 || coverageAreas.includes("الكل")) {
      // No restriction or wildcard — restaurant covers the whole city
      coverage_status = "full";
      if (matchingZone) {
        computed_delivery_fee = (r.delivery_fee ?? 0) + matchingZone.delivery_fee;
      }
    } else if (coverageAreas.includes(customerArea)) {
      // Explicitly covered area
      coverage_status = "covered";
    } else if (matchingZone) {
      // Same city but out-of-primary-zone — extra delivery fee applies
      coverage_status = "extra_fee";
      computed_delivery_fee = (r.delivery_fee ?? 0) + matchingZone.delivery_fee;
    } else {
      // Same city but no zone configured for this area
      coverage_status = "out_of_range";
    }

    return { ...r, coverage_status, computed_delivery_fee };
  });
};

export const getRestaurantById = async (id: string) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export const getRestaurantMenu = async (restaurantId: string) => {
  const [catRes, itemRes] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("restaurant_id", restaurantId).neq("is_active", false).order("sort_order"),
    supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).neq("is_available", false).order("sort_order"),
  ]);
  if (catRes.error) throw catRes.error;
  if (itemRes.error) throw itemRes.error;
  return { categories: catRes.data || [], items: itemRes.data || [] };
};

export const getMenuItemOptions = async (menuItemId: string) => {
  const { data, error } = await supabase
    .from("menu_item_options")
    .select("*")
    .eq("menu_item_id", menuItemId);
  if (error) throw error;
  return data;
};

export const getRestaurantReviews = async (restaurantId: string) => {
  const { data, error } = await supabase
    .from("restaurant_reviews")
    .select("*, profiles:customer_id(full_name, avatar_url)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
};

// ===== Cart =====
export const getCart = async (customerId: string, restaurantId: string) => {
  const { data, error } = await supabase
    .from("carts")
    .select("*")
    .eq("customer_id", customerId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const upsertCart = async (cart: { customer_id: string; restaurant_id: string; items: any[]; total_amount: number }) => {
  // Check existing
  const existing = await getCart(cart.customer_id, cart.restaurant_id);
  if (existing) {
    const { data, error } = await supabase.from("carts").update({
      items: cart.items as any,
      total_amount: cart.total_amount,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from("carts").insert({
      customer_id: cart.customer_id,
      restaurant_id: cart.restaurant_id,
      items: cart.items as any,
      total_amount: cart.total_amount,
    }).select().single();
    if (error) throw error;
    return data;
  }
};

export const clearCart = async (customerId: string, restaurantId: string) => {
  const { error } = await supabase.from("carts").delete().eq("customer_id", customerId).eq("restaurant_id", restaurantId);
  if (error) throw error;
};

// ===== Reviews =====
export const createReview = async (review: { restaurant_id: string; customer_id: string; rating: number; review?: string }) => {
  const { data, error } = await supabase.from("restaurant_reviews").insert(review).select().single();
  if (error) throw error;
  // Update restaurant rating
  const { data: reviews } = await supabase.from("restaurant_reviews").select("rating").eq("restaurant_id", review.restaurant_id);
  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await supabase.from("restaurants").update({ rating: Math.round(avg * 100) / 100, total_ratings: reviews.length }).eq("id", review.restaurant_id);
  }
  return data;
};

// ===== Menu Item Options Management =====
export const createMenuItemOption = async (option: any) => {
  const { data, error } = await supabase.from("menu_item_options").insert(option).select().single();
  if (error) throw error;
  return data;
};

export const updateMenuItemOption = async (id: string, updates: any) => {
  const { data, error } = await supabase.from("menu_item_options").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMenuItemOption = async (id: string) => {
  const { error } = await supabase.from("menu_item_options").delete().eq("id", id);
  if (error) throw error;
};

// ===== Create order from cart =====
export const createOrderFromCart = async (params: {
  customer_id: string;
  restaurant_id: string;
  delivery_company_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: string;
  notes?: string;
  /** Delivery fee charged to the restaurant when an offer grants free delivery */
  restaurant_delivery_subsidy?: number;
  /** ID of the applied offer (for tracking/analytics) */
  applied_offer_id?: string;
  /** Type of the applied offer (free_delivery, percent_off_delivery, percent_off_order, fixed_off_order) */
  applied_offer_type?: string;
  /** Human-readable title of the applied offer */
  applied_offer_title?: string;
}) => {
  const insertData: any = {
    customer_id: params.customer_id,
    restaurant_id: params.restaurant_id,
    delivery_company_id: params.delivery_company_id,
    customer_name: params.customer_name,
    customer_phone: params.customer_phone,
    customer_address: params.customer_address,
    delivery_lat: params.delivery_lat,
    delivery_lng: params.delivery_lng,
    items: params.items as any,
    subtotal: params.subtotal,
    delivery_fee: params.delivery_fee,
    tax: params.tax,
    total: params.total,
    payment_method: params.payment_method,
    status: "pending",
    payment_status: "pending",
    order_type: "restaurant",
    restaurant_delivery_subsidy: params.restaurant_delivery_subsidy ?? 0,
  };
  // Only include notes if provided (optional field)
  if (params.notes) {
    insertData.notes = params.notes;
  }
  // Applied offer tracking (requires DB columns from migration 011)
  if (params.applied_offer_id) insertData.applied_offer_id = params.applied_offer_id;
  if (params.applied_offer_type) insertData.applied_offer_type = params.applied_offer_type;
  if (params.applied_offer_title) insertData.applied_offer_title = params.applied_offer_title;
  const { data, error } = await supabase.from("delivery_orders").insert(insertData).select().single();
  if (error) throw error;

  // ──────────────────────────────────────────────────────────────
  // Financial split — THREE parties: platform / delivery company / restaurant
  // ──────────────────────────────────────────────────────────────
  try {
    const { calculateCommission } = await import("./accountingApi");

    // 1. Delivery company's gross delivery revenue
    const subsidy = params.restaurant_delivery_subsidy ?? 0;
    const deliveryRevenueBase = params.delivery_fee + subsidy;

    // 2. Platform commission from admin's accounting_settings (not hardcoded 12%)
    const { commission: platformCommission, earning: companyDeliveryEarning } =
      await calculateCommission(deliveryRevenueBase, "delivery", params.delivery_company_id);

    // 3. Restaurant's net food revenue
    const { data: restRow } = await supabase
      .from("restaurants")
      .select("commission_rate, name_ar")
      .eq("id", params.restaurant_id)
      .maybeSingle();
    const restCommissionRate = Number((restRow as any)?.commission_rate || 0);
    const restCommissionCut = Math.floor(params.subtotal * restCommissionRate / 100);
    const restaurantNetEarning = params.subtotal - restCommissionCut - subsidy;

    // Delivery company's display name from profiles
    const { data: companyProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", params.delivery_company_id)
      .maybeSingle();

    // Row 1 — Delivery company settlement
    await (supabase.from("financial_transactions") as any).insert({
      reference_id: data.id,
      order_id: data.id,
      transaction_type: "delivery_order",
      partner_type: "delivery_company",
      customer_id: params.customer_id,
      partner_id: params.delivery_company_id,
      partner_name: (companyProfile as any)?.full_name ?? null,
      amount: deliveryRevenueBase,
      platform_commission: platformCommission,
      partner_earning: companyDeliveryEarning,
      payment_method: params.payment_method,
      payment_status: "pending",
      notes: `عمولة توصيل — طلب ${data.id}`,
    });

    // Row 2 — Restaurant settlement
    await (supabase.from("financial_transactions") as any).insert({
      reference_id: data.id,
      order_id: data.id,
      transaction_type: "restaurant_order",
      partner_type: "restaurant",
      customer_id: params.customer_id,
      partner_id: params.restaurant_id,
      partner_name: (restRow as any)?.name_ar ?? null,
      amount: params.subtotal,
      platform_commission: 0,
      partner_earning: restaurantNetEarning,
      payment_method: params.payment_method,
      payment_status: "pending",
      notes: `صافي إيرادات الطعام — طلب ${data.id} (عمولة شركة التوصيل: ${restCommissionCut} ر.ي)`,
    });
  } catch (finErr) {
    // Never block order creation if financial tracking fails
    console.error("Financial transaction split failed:", finErr);
  }

  // Clear cart
  await clearCart(params.customer_id, params.restaurant_id);
  return data;
};

// ===== Dynamic Categories =====
export const getServiceTypes = async () => {
  const { data, error } = await (supabase
    .from("service_types" as any)
    .select("*")
    .eq("is_active", true)
    .order("sort_order") as any);
  if (error) throw error;
  return data;
};

export const getRestaurantCuisines = async () => {
  const { data, error } = await (supabase
    .from("restaurant_cuisines" as any)
    .select("*")
    .eq("is_active", true)
    .order("sort_order") as any);
  if (error) throw error;
  return data;
};
