import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, Car, Calendar, Star, Shield, Lock, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DriverProfile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [driverData, setDriverData] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

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

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ تم تغيير كلمة المرور بنجاح" });
      setNewPassword("");
      setChangingPassword(false);
    }
    setSavingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isApproved = driverData?.is_approved;

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const age = calculateAge(driverData?.date_of_birth);

  const infoItems = [
    { icon: User, label: "الاسم", value: profile?.full_name || "—", locked: isApproved },
    { icon: Phone, label: "رقم الهاتف", value: profile?.phone || "—", locked: false },
    { icon: Mail, label: "البريد الإلكتروني", value: user?.email || "—", locked: false },
    { icon: Calendar, label: "تاريخ الميلاد", value: driverData?.date_of_birth ? new Date(driverData.date_of_birth).toLocaleDateString("ar-YE") : "—", locked: isApproved },
    ...(age ? [{ icon: User, label: "العمر", value: `${age} سنة`, locked: true }] : []),
    { icon: Calendar, label: "تاريخ التسجيل", value: driverData?.created_at ? new Date(driverData.created_at).toLocaleDateString("ar-YE") : "—", locked: true },
    { icon: Star, label: "التقييم", value: driverData?.rating || "0", locked: true },
    { icon: Shield, label: "حالة الحساب", value: isApproved ? "معتمد" : "قيد المراجعة", locked: true },
  ];

  const vehicleTypeLabels: Record<string, string> = { car: "سيارة", motorcycle: "دراجة نارية", tuktuk: "توك توك" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الملف الشخصي</h1>

      {isApproved && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border text-sm text-muted-foreground">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          <span>بعض البيانات مقفلة بعد الموافقة على حسابك. لتعديلها، تواصل مع الدعم.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المعلومات الشخصية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {infoItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <item.icon className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground w-32">{item.label}</span>
              <span className="text-sm font-medium text-foreground flex-1">{item.value}</span>
              {item.locked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!changingPassword ? (
            <Button variant="outline" onClick={() => setChangingPassword(true)} className="gap-2">
              <KeyRound className="w-4 h-4" />
              تغيير كلمة المرور
            </Button>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={savingPassword} size="sm">
                  {savingPassword ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setChangingPassword(false); setNewPassword(""); }}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
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
          <CardTitle className="text-lg flex items-center gap-2">
            المركبات
            {isApproved && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          </CardTitle>
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
