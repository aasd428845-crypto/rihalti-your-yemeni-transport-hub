import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a partner has completed their profile.
 * Returns { isComplete, checking }
 */
export const usePartnerProfileCheck = () => {
  const { user, role } = useAuth();
  const [isComplete, setIsComplete] = useState(true);
  const [checking, setChecking] = useState(true);

  const partnerRoles = ["supplier", "delivery_company", "driver"];

  useEffect(() => {
    if (!user || !role || !partnerRoles.includes(role)) {
      setChecking(false);
      return;
    }

    const check = async () => {
      try {
        // Check profile fields
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, logo_url, profile_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile) {
          setIsComplete(false);
          setChecking(false);
          return;
        }

        // If already marked complete, skip
        if (profile.profile_completed) {
          setIsComplete(true);
          setChecking(false);
          return;
        }

        // Check working areas
        const { data: areas } = await supabase
          .from("supplier_working_areas")
          .select("id")
          .eq("supplier_id", user.id)
          .limit(1);

        const hasName = !!profile.full_name?.trim();
        const hasPhone = !!profile.phone?.trim();
        const hasAreas = (areas?.length || 0) > 0;

        setIsComplete(hasName && hasPhone && hasAreas);
      } catch {
        setIsComplete(false);
      }
      setChecking(false);
    };

    check();
  }, [user?.id, role]);

  return { isComplete, checking, isPartner: partnerRoles.includes(role || "") };
};
