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
 * Uses the service role key to bypass RLS — safe because the caller only
 * receives is_active=true rows scoped to the requested companyId.
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

export default router;
