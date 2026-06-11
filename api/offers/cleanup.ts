import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { companyId, promoId, restaurantId } = req.body as {
    companyId?: string;
    promoId?: string;
    restaurantId?: string;
  };

  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const key = serviceKey || anonKey;

  if (!supabaseUrl || !key) {
    return res.status(503).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let deletedCount = 0;

  // Strategy 1 — by source_promo_id (post-migration 010)
  if (promoId) {
    const { data, error } = await supabase
      .from("delivery_company_offers")
      .delete()
      .eq("delivery_company_id", companyId)
      .eq("source_promo_id", promoId)
      .select("id");
    if (!error) deletedCount += data?.length ?? 0;
  }

  // Strategy 2 — by restaurant_id (pre-migration 010 fallback)
  if (deletedCount === 0 && restaurantId) {
    const { data, error } = await supabase
      .from("delivery_company_offers")
      .delete()
      .eq("delivery_company_id", companyId)
      .eq("restaurant_id", restaurantId)
      .select("id");
    if (!error) deletedCount += data?.length ?? 0;
  }

  // Strategy 3 — bulk-clear all offers for this company
  if (!promoId && !restaurantId) {
    const { data, error } = await supabase
      .from("delivery_company_offers")
      .delete()
      .eq("delivery_company_id", companyId)
      .select("id");
    if (error) return res.status(500).json({ error: error.message });
    deletedCount = data?.length ?? 0;
  }

  return res.status(200).json({ deleted: deletedCount });
}
