import { supabase } from "@/integrations/supabase/client";

export type PromoType =
  | "free_delivery_min_order"
  | "free_delivery_schedule"
  | "free_delivery_limited"
  | "discount_percent"
  | "fixed_discount"
  | "buy_x_get_y"
  | "custom_text";

export type MenuItemPromoType = "discount_percent" | "fixed_price" | "custom_text";

export interface RestaurantPromotion {
  id: string;
  restaurant_id: string;
  promo_type: PromoType;
  title: string;
  description?: string;
  promo_text?: string;
  min_order_amount?: number;
  discount_percent?: number;
  discount_amount?: number;
  buy_quantity?: number;
  get_quantity?: number;
  active_days?: string[];
  start_time?: string;
  end_time?: string;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export const getRestaurantPromotions = async (restaurantId: string): Promise<RestaurantPromotion[]> => {
  const { data, error } = await supabase
    .from("restaurant_promotions" as any)
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order");
  if (error) throw error;
  return (data as any[]) || [];
};

export const getActiveRestaurantPromotions = async (restaurantId: string): Promise<RestaurantPromotion[]> => {
  const { data, error } = await supabase
    .from("restaurant_promotions" as any)
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data as any[]) || [];
};

export const createRestaurantPromotion = async (promo: Partial<RestaurantPromotion>): Promise<RestaurantPromotion> => {
  const { data, error } = await supabase
    .from("restaurant_promotions" as any)
    .insert(promo)
    .select()
    .single();
  if (error) throw error;
  return data as any;
};

export const updateRestaurantPromotion = async (id: string, updates: Partial<RestaurantPromotion>): Promise<RestaurantPromotion> => {
  const { data, error } = await supabase
    .from("restaurant_promotions" as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as any;
};

export const deleteRestaurantPromotion = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("restaurant_promotions" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
};

// ─── Helper: compute effective delivery fee based on active promotions ────────
export const computeEffectiveDeliveryFee = (
  baseFee: number,
  orderAmount: number,
  promotions: RestaurantPromotion[]
): { fee: number; promoLabel: string | null } => {
  const now = new Date();
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const today = dayNames[now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);

  for (const p of promotions.filter(p => p.is_active)) {
    if (p.promo_type === "free_delivery_min_order") {
      if (orderAmount >= (p.min_order_amount || 0)) {
        return { fee: 0, promoLabel: p.title };
      }
    }
    if (p.promo_type === "free_delivery_schedule") {
      const dayMatch = !p.active_days?.length || p.active_days.includes(today);
      const startOk = !p.start_time || currentTime >= p.start_time;
      const endOk = !p.end_time || currentTime <= p.end_time;
      if (dayMatch && startOk && endOk) {
        return { fee: 0, promoLabel: p.title };
      }
    }
    if (p.promo_type === "free_delivery_limited") {
      const startOk = !p.starts_at || new Date(p.starts_at) <= now;
      const endOk = !p.ends_at || new Date(p.ends_at) >= now;
      if (startOk && endOk) {
        return { fee: 0, promoLabel: p.title };
      }
    }
  }
  return { fee: baseFee, promoLabel: null };
};

// ─── Helper: compute effective item price based on item promo fields ──────────
export const computeItemPromo = (item: {
  price: number;
  discounted_price?: number | null;
  promo_type?: string | null;
  promo_value?: number | null;
  promo_text?: string | null;
  promo_active?: boolean;
}): {
  originalPrice: number;
  finalPrice: number;
  promoLabel: string | null;
  hasPromo: boolean;
} => {
  const base = item.price;

  // Legacy: discounted_price with no promo_type
  if (!item.promo_active && item.discounted_price && item.discounted_price < base) {
    return { originalPrice: base, finalPrice: item.discounted_price, promoLabel: null, hasPromo: true };
  }

  if (!item.promo_active) {
    return { originalPrice: base, finalPrice: base, promoLabel: null, hasPromo: false };
  }

  if (item.promo_type === "discount_percent" && item.promo_value) {
    const final = Math.round(base * (1 - item.promo_value / 100));
    return { originalPrice: base, finalPrice: final, promoLabel: `خصم ${item.promo_value}%`, hasPromo: true };
  }

  if (item.promo_type === "fixed_price" && item.promo_value) {
    return { originalPrice: base, finalPrice: item.promo_value, promoLabel: null, hasPromo: true };
  }

  if (item.promo_type === "custom_text" && item.promo_text) {
    return { originalPrice: base, finalPrice: base, promoLabel: item.promo_text, hasPromo: true };
  }

  return { originalPrice: base, finalPrice: base, promoLabel: null, hasPromo: false };
};
