import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Car, Calendar, Star, Shield, Building } from "lucide-react";

const DeliveryDriverProfile = () => {
  const { user, profile } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setDriverData(data);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const vehicleTypeLabels: Record<string, string> = {
    car: "سيارة", motorcycle: "دراجة نارية", tuktuk: "توك توك", bicycle: "دراجة هوائية",
  };

  const infoItems = [
    { icon: User, label: "الاسم", value: profile?.full_name || "—" },
    { icon: Phone, label: "رقم الهاتف", value: profile?.phone || "—" },
    { icon: Mail, label: "البريد الإلكتروني", value: user?.email || "—" },
    { icon: Calendar, label: "تاريخ التسجيل", value: driverData?.created_at ? new Date(driverData.created_at).toLocaleDateString("ar-YE") : "—" },
    { icon: Star, label: "التقييم", value: driverData?.rating || "0" },
    { icon: Shield, label: "حالة الحساب", value: driverData?.is_approved ? "معتمد" : "قيد المراجعة" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الملف الشخصي</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">المعلومات الشخصية</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <item.icon className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground w-32">{item.label}</span>
              <span className="text-sm font-medium text-foreground flex-1">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {driverData && (
        <Card>
          <CardHeader><CardTitle className="text-lg">معلومات المركبة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 py-2 border-b border-border">
              <Car className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground w-32">نوع المركبة</span>
              <span className="text-sm font-medium text-foreground">{vehicleTypeLabels[driverData.vehicle_type] || driverData.vehicle_type || "—"}</span>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-border">
              <span className="text-sm text-muted-foreground w-32 mr-8">رقم اللوحة</span>
              <span className="text-sm font-medium text-foreground">{driverData.vehicle_plate || "—"}</span>
            </div>
            <div className="flex items-center gap-3 py-2">
              <span className="text-sm text-muted-foreground w-32 mr-8">رقم الرخصة</span>
              <span className="text-sm font-medium text-foreground">{driverData.license_number || "—"}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryDriverProfile;
