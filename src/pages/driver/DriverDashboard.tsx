import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign, Star, MapPin } from "lucide-react";

const DriverDashboard = () => {
  const { user, profile } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDriver = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setDriverData(data);
      setLoading(false);
    };
    fetchDriver();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!driverData?.is_approved) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
          <span className="text-4xl">⏳</span>
        </div>
        <h2 className="text-xl font-bold text-foreground">حسابك قيد المراجعة</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          لم تتم الموافقة على حسابك بعد. يرجى الانتظار حتى يراجع المشرف بياناتك ومستنداتك.
        </p>
      </div>
    );
  }

  const stats = [
    { title: "إجمالي الرحلات", value: driverData.total_trips || 0, icon: Car, color: "text-primary" },
    { title: "إجمالي الأرباح", value: `${driverData.total_earnings || 0} ر.ي`, icon: DollarSign, color: "text-emerald-600" },
    { title: "التقييم", value: driverData.rating || "0.0", icon: Star, color: "text-amber-500" },
    { title: "الحالة", value: driverData.is_online ? "متصل" : "غير متصل", icon: MapPin, color: driverData.is_online ? "text-emerald-600" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          مرحباً، {profile?.full_name || "سائق"}
        </h1>
        <p className="text-muted-foreground text-sm">لوحة تحكم السائق</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DriverDashboard;
