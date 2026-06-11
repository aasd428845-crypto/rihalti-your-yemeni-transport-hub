import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/offers/active?companyId=X
 *
 * Returns all currently-active delivery_company_offers for the given company.
 * Uses the service role key to bypass RLS.
 */
router.get("/offers/active", async (req, res) => {
  const { companyId } = req.query as { companyId?: string };

  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "Service not configured" });
  }

  const supabase = adminClient();

  const { data, error } = await supabase
    .from("delivery_company_offers")
    .select("*")
    .eq("delivery_company_id", companyId)
    .eq("is_active", true);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ offers: data ?? [] });
});

/**
 * DELETE /api/offers/cleanup
 *
 * Deletes delivery_company_offers rows linked to a deleted restaurant_promotion.
 * Uses service-role key so it bypasses RLS and missing-column errors.
 *
 * Body (JSON): { companyId, promoId?, restaurantId? }
 *   - promoId     → delete by source_promo_id (requires migration 010)
 *   - restaurantId → fallback: delete by delivery_company_id + restaurant_id
 *   - neither      → delete ALL rows for this companyId (bulk-clear)
 */
router.delete("/offers/cleanup", async (req, res) => {
  const { companyId, promoId, restaurantId } = req.body as {
    companyId?: string;
    promoId?: string;
    restaurantId?: string;
  };

  if (!companyId) {
    return res.status(400).json({ error: "companyId is required" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "Service not configured" });
  }

  const supabase = adminClient();
  let deletedCount = 0;

  // Strategy 1 — delete by source_promo_id (post-migration 010)
  if (promoId) {
    const { data, error } = await supabase
      .from("delivery_company_offers")
      .delete()
      .eq("delivery_company_id", companyId)
      .eq("source_promo_id", promoId)
      .select("id");

    if (!error) {
      deletedCount += data?.length ?? 0;
    }
    // If source_promo_id column doesn't exist yet, fall through to strategy 2
  }

  // Strategy 2 — delete by restaurant_id (pre-migration 010 fallback)
  if (deletedCount === 0 && restaurantId) {
    const { data, error } = await supabase
      .from("delivery_company_offers")
      .delete()
      .eq("delivery_company_id", companyId)
      .eq("restaurant_id", restaurantId)
      .select("id");

    if (!error) {
      deletedCount += data?.length ?? 0;
    }
  }

  // Strategy 3 — bulk-clear: delete ALL offers for this company
  //   Used when neither promoId nor restaurantId is given (e.g. "delete all")
  if (!promoId && !restaurantId) {
    const { data, error } = await supabase
      .from("delivery_company_offers")
      .delete()
      .eq("delivery_company_id", companyId)
      .select("id");

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    deletedCount = data?.length ?? 0;
  }

  return res.json({ deleted: deletedCount });
});

export default router;
