import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, TrendingUp, TrendingDown, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PointsData {
  points: number;
  total_earned: number;
  total_redeemed: number;
}

interface HistoryItem {
  id: string;
  points: number;
  type: string;
  description: string;
  created_at: string;
}

const LoyaltyPointsCard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<PointsData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [pointsRes, historyRes] = await Promise.all([
        supabase.from("loyalty_points" as any).select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("loyalty_points_history" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);
      if (pointsRes.data) setData(pointsRes.data as any);
      if (historyRes.data) setHistory(historyRes.data as any[]);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return null;

  const pointsValue = data?.points || 0;
  const totalEarned = data?.total_earned || 0;

  // Points tiers
  const getTier = (pts: number) => {
    if (pts >= 1000) return { name: "ذهبي", color: "bg-yellow-500", icon: "🥇" };
    if (pts >= 500) return { name: "فضي", color: "bg-gray-400", icon: "🥈" };
    if (pts >= 100) return { name: "برونزي", color: "bg-amber-600", icon: "🥉" };
    return { name: "عضو جديد", color: "bg-primary", icon: "⭐" };
  };

  const tier = getTier(totalEarned);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-primary" />
          نقاط الولاء
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Points Summary */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-l from-primary/10 to-primary/5">
          <div>
            <p className="text-3xl font-bold text-primary">{pointsValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">نقطة متاحة</p>
          </div>
          <div className="text-center">
            <span className="text-2xl">{tier.icon}</span>
            <Badge variant="secondary" className="block mt-1 text-xs">{tier.name}</Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">مكتسبة</p>
              <p className="font-semibold text-sm text-green-700 dark:text-green-400">{totalEarned}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">مستبدلة</p>
              <p className="font-semibold text-sm text-red-700 dark:text-red-400">{data?.total_redeemed || 0}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <p className="font-medium mb-1">كيف تكسب النقاط؟</p>
          <ul className="space-y-0.5 mr-3 list-disc">
            <li>حجز رحلة: +10 نقاط</li>
            <li>طلب شحن: +15 نقطة</li>
            <li>طلب توصيل: +5 نقاط</li>
            <li>تقييم خدمة: +3 نقاط</li>
          </ul>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">آخر الحركات</p>
            <div className="space-y-2 max-h-48 overflow-auto">
              {history.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {item.type === "earn" ? (
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className="text-muted-foreground text-xs">{item.description}</span>
                  </div>
                  <span className={`font-medium text-xs ${item.points > 0 ? "text-green-600" : "text-red-600"}`}>
                    {item.points > 0 ? "+" : ""}{item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsCard;
