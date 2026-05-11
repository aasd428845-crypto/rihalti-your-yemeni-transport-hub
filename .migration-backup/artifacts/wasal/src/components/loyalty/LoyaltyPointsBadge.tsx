import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LoyaltyPointsBadge = () => {
  const { user } = useAuth();
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("loyalty_points" as any)
        .select("points")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPoints((data as any).points);
    };
    load();
  }, [user]);

  if (points === null || points === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium">
      <Gift className="w-3.5 h-3.5" />
      <span>{points} نقطة</span>
    </div>
  );
};

export default LoyaltyPointsBadge;
