import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Car, Calendar, Star, Shield } from "lucide-react";

const DriverProfile = () => {
  const { user, profile } = useAuth();
  const [driverData, setDriverData] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [driverRes, vehicleRes] = await Promise.all([
        supabase.from("drivers").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("vehicles").select("*").eq("driver_id", user.id).order("is_default", { ascending: false }),
      ]);
      setDriverData(driverRes.data);
      setVehicles(vehicleRes.data || []);
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

  const infoItems = [
    { icon: User, label: "الاسم", value: profile?.full_name || "—" },
    { icon: Phone, label: "رقم الهاتف", value: profile?.phone || "—" },
    { icon: Mail, label: "البريد الإلكتروني", value: user?.email || "—" },
    { icon: Calendar, label: "تاريخ التسجيل", value: driverData?.created_at ? new Date(driverData.created_at).toLocaleDateString("ar-YE") : "—" },
    { icon: Star, label: "التقييم", value: driverData?.rating || "0" },
    { icon: Shield, label: "حالة الحساب", value: driverData?.is_approved ? "معتمد" : "قيد المراجعة" },
  ];

  const vehicleTypeLabels: Record<string, string> = { car: "سيارة", motorcycle: "دراجة نارية", tuktuk: "توك توك" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الملف الشخصي</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المعلومات الشخصية</CardTitle>
        </CardHeader>
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
          <CardHeader>
            <CardTitle className="text-lg">معلومات الرخصة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 py-2 border-b border-border">
              <span className="text-sm text-muted-foreground w-32">رقم الرخصة</span>
              <span className="text-sm font-medium text-foreground">{driverData.license_number || "—"}</span>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-border">
              <span className="text-sm text-muted-foreground w-32">تاريخ الانتهاء</span>
              <span className="text-sm font-medium text-foreground">
                {driverData.license_expiry ? new Date(driverData.license_expiry).toLocaleDateString("ar-YE") : "—"}
              </span>
            </div>
            <div className="flex items-center gap-3 py-2">
              <span className="text-sm text-muted-foreground w-32">سنوات الخبرة</span>
              <span className="text-sm font-medium text-foreground">{driverData.years_experience || "—"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المركبات</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد مركبات مسجلة</p>
          ) : (
            <div className="space-y-3">
              {vehicles.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Car className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.brand} {v.model} {v.year || ""}</p>
                      <p className="text-xs text-muted-foreground">{v.plate_number} · {vehicleTypeLabels[v.vehicle_type] || v.vehicle_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.color && <Badge variant="outline" className="text-xs">{v.color}</Badge>}
                    {v.is_default && <Badge className="text-xs">افتراضية</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverProfile;
