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

// ─── Helper: check if a menu item promo is active right now (respects schedule) ──
export const isPromoScheduleActive = (item: {
  promo_active?: boolean;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  promo_active_days?: string[] | null;
  promo_start_time?: string | null;
  promo_end_time?: string | null;
}): boolean => {
  if (!item.promo_active) return false;
  const now = new Date();

  if (item.promo_starts_at && new Date(item.promo_starts_at) > now) return false;
  if (item.promo_ends_at && new Date(item.promo_ends_at) < now) return false;

  if (item.promo_active_days && item.promo_active_days.length > 0) {
    const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const today = dayNames[now.getDay()];
    if (!item.promo_active_days.includes(today)) return false;
  }

  if (item.promo_start_time || item.promo_end_time) {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (item.promo_start_time) {
      const [h, m] = item.promo_start_time.split(":").map(Number);
      if (nowMin < h * 60 + (m || 0)) return false;
    }
    if (item.promo_end_time) {
      const [h, m] = item.promo_end_time.split(":").map(Number);
      if (nowMin >= h * 60 + (m || 0)) return false;
    }
  }

  return true;
};

// ─── Helper: get countdown string until promo ends ────────────────────────────
export const getPromoCountdown = (endsAt?: string | null): string | null => {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMin = Math.floor(diff / 60000);
  if (totalMin < 1) return "ينتهي الآن";
  if (totalMin < 60) return `ينتهي خلال ${totalMin} د`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return `ينتهي خلال ${hours}س${mins > 0 ? ` ${mins}د` : ""}`;
  const days = Math.floor(hours / 24);
  return `ينتهي خلال ${days} يوم`;
};

// ─── Notify all customers about a new promotion ───────────────────────────────
export const notifyCustomersAboutPromo = async (
  title: string,
  body: string,
  restaurantId?: string,
  image?: string
) => {
  try {
    const { supabase: sb } = await import("@/integrations/supabase/client");
    await (sb as any).functions.invoke("send-push-notification", {
      body: {
        targetRole: "customer",
        title,
        body,
        sound: "default",
        data: { type: "promo", restaurant_id: restaurantId },
        url: restaurantId ? `/restaurants/${restaurantId}` : "/food",
        image,
      },
    });
  } catch (e) {
    console.warn("Could not send promo notification:", e);
  }
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
