import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { companyId } = req.query as { companyId?: string };
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

  const { data, error } = await supabase
    .from("delivery_company_offers")
    .select("*")
    .eq("delivery_company_id", companyId)
    .eq("is_active", true);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ offers: data ?? [] });
}
