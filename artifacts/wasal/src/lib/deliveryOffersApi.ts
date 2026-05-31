import { supabase } from "@/integrations/supabase/client";

export type OfferType =
  | "free_delivery"
  | "percent_off_delivery"
  | "fixed_off_delivery"
  | "percent_off_order"
  | "fixed_off_order"
  | "buy_x_get_y"
  | "custom";

export interface DeliveryOffer {
  id: string;
  delivery_company_id: string;
  restaurant_id?: string | null;
  title: string;
  description?: string | null;
  image_url?: string | null;
  badge_text?: string | null;
  offer_type: OfferType;
  discount_percent?: number | null;
  discount_amount?: number | null;
  min_order_amount?: number | null;
  active_days?: string[] | null;
  start_time?: string | null;
  end_time?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  restaurant?: { id: string; name_ar: string; logo_url?: string | null } | null;
}

const TABLE = "delivery_company_offers" as any;

export const getDeliveryOffers = async (companyId: string): Promise<DeliveryOffer[]> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("delivery_company_id", companyId)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as DeliveryOffer[];
};

export const createDeliveryOffer = async (offer: Omit<DeliveryOffer, "id" | "created_at" | "restaurant">) => {
  const { data, error } = await supabase.from(TABLE).insert(offer).select().single();
  if (error) throw error;
  return data as unknown as DeliveryOffer;
};

export const updateDeliveryOffer = async (id: string, updates: Partial<DeliveryOffer>) => {
  const { error } = await supabase.from(TABLE).update(updates).eq("id", id);
  if (error) throw error;
};

export const deleteDeliveryOffer = async (id: string) => {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
};

// ─── Shared: time/day validity check ──────────────────────────────────────
export function isOfferCurrentlyActive(offer: DeliveryOffer): boolean {
  const now = new Date();
  const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const todayName = ARABIC_DAYS[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (offer.starts_at && new Date(offer.starts_at) > now) return false;
  if (offer.ends_at && new Date(offer.ends_at) < now) return false;
  if (offer.active_days?.length && !offer.active_days.includes(todayName)) return false;
  if (offer.start_time && currentTime < offer.start_time) return false;
  if (offer.end_time && currentTime > offer.end_time) return false;
  return true;
}

// ─── Shared: delivery fee discount (for delivery-type offers) ──────────
export function buildFeeDiscount(offer: DeliveryOffer): (fee: number) => number {
  return (originalFee: number): number => {
    if (offer.offer_type === "free_delivery") return 0;
    if (offer.offer_type === "percent_off_delivery") {
      const pct = offer.discount_percent || 0;
      return Math.max(0, Math.round(originalFee * (1 - pct / 100)));
    }
    if (offer.offer_type === "fixed_off_delivery") {
      return Math.max(0, originalFee - (offer.discount_amount || 0));
    }
    // Order-level or combo/custom offers don't affect the delivery fee
    return originalFee;
  };
}

// ─── Shared: order subtotal discount (for order-type offers) ────────────
export function buildOrderDiscount(offer: DeliveryOffer): (subtotal: number) => number {
  return (originalSubtotal: number): number => {
    if (offer.offer_type === "percent_off_order") {
      const pct = offer.discount_percent || 0;
      return Math.max(0, Math.round(originalSubtotal * (1 - pct / 100)));
    }
    if (offer.offer_type === "fixed_off_order") {
      return Math.max(0, originalSubtotal - (offer.discount_amount || 0));
    }
    // Delivery or combo/custom offers don't affect the subtotal
    return originalSubtotal;
  };
}

/**
 * Fetch ALL currently-active customer-facing offers (all companies),
 * joined with restaurant info for display and navigation.
 * Falls back to a basic select if the restaurant_id column doesn't exist yet.
 */
export const getCustomerActiveOffers = async (): Promise<DeliveryOffer[]> => {
  try {
    // Try with restaurant join first (requires migration 008 to be applied)
    const { data, error } = await supabase
      .from(TABLE)
      .select("*, restaurant:restaurant_id(id, name_ar, logo_url)")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (error) {
      // Column may not exist yet — fall back to plain select
      const { data: fallback, error: fallbackErr } = await supabase
        .from(TABLE)
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (fallbackErr || !fallback) return [];
      return (fallback as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
    }

    if (!data) return [];
    return (data as unknown as DeliveryOffer[]).filter(isOfferCurrentlyActive);
  } catch {
    return [];
  }
};

/**
 * Fetch active offers for a specific delivery company + restaurant — used at checkout.
 * Priority: restaurant-specific offer first, then company-wide offers.
 * Returns the first time-valid offer with its full data (so the caller can
 * check min_order_amount against the current cart subtotal).
 *
 * NOTE: We intentionally do NOT filter by delivery_company_id in the Supabase query
 * because RLS policies on this table only allow customers to read rows without
 * a company-scoped filter. We fetch all active offers and filter in JS instead.
 * This mirrors the approach used by getCustomerActiveOffers() which already works
 * for all user roles.
 */
export const getActiveOffersForCompany = async (
  companyId: string,
  restaurantId?: string
): Promise<{
  offer: DeliveryOffer;
  appliedFeeDiscount: (fee: number) => number;
  appliedOrderDiscount: (subtotal: number) => number;
} | null> => {
  try {
    // Fetch all active offers using the same query that works for customers,
    // then filter by company ID in JavaScript to avoid RLS blocking.
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("is_active", true);

    if (error || !data?.length) return null;

    // Filter by company and time validity in JS
    const companyOffers = (data as unknown as DeliveryOffer[])
      .filter(o => o.delivery_company_id === companyId)
      .filter(isOfferCurrentlyActive);

    if (!companyOffers.length) return null;

    const wrap = (o: DeliveryOffer) => ({
      offer: o,
      appliedFeeDiscount: buildFeeDiscount(o),
      appliedOrderDiscount: buildOrderDiscount(o),
    });

    // 1. Try restaurant-specific offer first (restaurant_id matches)
    if (restaurantId) {
      const specific = companyOffers.find(o => o.restaurant_id === restaurantId);
      if (specific) return wrap(specific);
    }

    // 2. Fall back to company-wide offer (restaurant_id is null/undefined)
    const companyWide = companyOffers.find(o => !o.restaurant_id);
    if (companyWide) return wrap(companyWide);

    return null;
  } catch {
    return null;
  }
};
