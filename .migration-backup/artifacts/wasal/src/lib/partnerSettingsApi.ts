import { supabase } from "@/integrations/supabase/client";

export interface PartnerSettings {
  partner_id: string;
  allow_direct_payment: boolean;
  cash_on_delivery_enabled: boolean;
  cash_on_ride_enabled: boolean;
}

export const getPartnerSettings = async (partnerId: string): Promise<PartnerSettings | null> => {
  const { data } = await supabase
    .from("partner_settings" as any)
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();
  return data as unknown as PartnerSettings | null;
};

export const upsertPartnerSettings = async (settings: Partial<PartnerSettings> & { partner_id: string }) => {
  const { error } = await supabase
    .from("partner_settings" as any)
    .upsert({
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: "partner_id" });
  if (error) throw error;
};

export const getAllPartnerSettings = async (): Promise<PartnerSettings[]> => {
  const { data, error } = await supabase
    .from("partner_settings" as any)
    .select("*");
  if (error) throw error;
  return (data || []) as unknown as PartnerSettings[];
};
