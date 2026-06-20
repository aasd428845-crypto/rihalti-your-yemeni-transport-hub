import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_WA_NUMBER = "967712345678";
export const WA_SETTING_KEY = "whatsapp_support_number";

export const useWhatsappNumber = () => {
  const [number, setNumber] = useState(DEFAULT_WA_NUMBER);

  useEffect(() => {
    ((supabase as any).from("app_settings"))
      .select("value")
      .eq("key", WA_SETTING_KEY)
      .maybeSingle()
      .then(({ data }: { data: { value: string } | null }) => {
        if (data?.value) setNumber(data.value);
      })
      .catch(() => {});
  }, []);

  return number;
};
