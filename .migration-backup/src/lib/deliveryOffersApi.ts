import { supabase } from "@/integrations/supabase/client";

export type OfferType = "free_delivery" | "percent_off_delivery" | "fixed_off_delivery";

export interface DeliveryOffer {
  id: string;
  delivery_company_id: string;
  title: string;
  description?: string | null;
  offer_type: OfferType;
  discount_percent?: number | null;
  discount_amount?: number | null;
  min_order_amount?: number | null;
  active_days?: string[] | null; // e.g. ["الخميس","الجمعة"]
  start_time?: string | null;    // "18:00"
  end_time?: string | null;      // "23:00"
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
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
  return (data || []) as DeliveryOffer[];
};

export const createDeliveryOffer = async (offer: Omit<DeliveryOffer, "id" | "created_at">) => {
  const { data, error } = await supabase.from(TABLE).insert(offer).select().single();
  if (error) throw error;
  return data as DeliveryOffer;
};

export const updateDeliveryOffer = async (id: string, updates: Partial<DeliveryOffer>) => {
  const { error } = await supabase.from(TABLE).update(updates).eq("id", id);
  if (error) throw error;
};

export const deleteDeliveryOffer = async (id: string) => {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw error;
};

/**
 * Fetch active offers for a given delivery company and determine
 * if any currently applies (by day/time/date).
 */
export const getActiveOffersForCompany = async (
  companyId: string
): Promise<{ offer: DeliveryOffer; appliedFeeDiscount: (fee: number) => number } | null> => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("delivery_company_id", companyId)
      .eq("is_active", true);
    if (error || !data?.length) return null;

    const now = new Date();
    const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const todayName = ARABIC_DAYS[now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    for (const offer of data as DeliveryOffer[]) {
      // Date range check
      if (offer.starts_at && new Date(offer.starts_at) > now) continue;
      if (offer.ends_at && new Date(offer.ends_at) < now) continue;

      // Day check
      if (offer.active_days?.length && !offer.active_days.includes(todayName)) continue;

      // Time range check
      if (offer.start_time && currentTime < offer.start_time) continue;
      if (offer.end_time && currentTime > offer.end_time) continue;

      // This offer is active — build the discount function
      const appliedFeeDiscount = (originalFee: number): number => {
        if (offer.offer_type === "free_delivery") return 0;
        if (offer.offer_type === "percent_off_delivery") {
          const pct = offer.discount_percent || 0;
          return Math.max(0, Math.round(originalFee * (1 - pct / 100)));
        }
        if (offer.offer_type === "fixed_off_delivery") {
          return Math.max(0, originalFee - (offer.discount_amount || 0));
        }
        return originalFee;
      };

      return { offer, appliedFeeDiscount };
    }
    return null;
  } catch {
    return null;
  }
};
