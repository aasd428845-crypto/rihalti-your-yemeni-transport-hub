import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPartnerSettings, upsertPartnerSettings } from "@/lib/partnerSettingsApi";
import { Loader2, CreditCard, Banknote, Car } from "lucide-react";

const PartnerPaymentSettings = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cashOnDelivery, setCashOnDelivery] = useState(true);
  const [cashOnRide, setCashOnRide] = useState(true);
  const [directPaymentAllowed, setDirectPaymentAllowed] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const settings = await getPartnerSettings(user.id);
        if (settings) {
          setCashOnDelivery(settings.cash_on_delivery_enabled);
          setCashOnRide(settings.cash_on_ride_enabled);
          setDirectPaymentAllowed(settings.allow_direct_payment);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSave = async (field: string, value: boolean) => {
    if (!user) return;
    setSaving(true);
    try {
      const updates: any = { partner_id: user.id };
      if (field === "cash_on_delivery_enabled") {
        updates.cash_on_delivery_enabled = value;
        setCashOnDelivery(value);
      } else if (field === "cash_on_ride_enabled") {
        updates.cash_on_ride_enabled = value;
        setCashOnRide(value);
      }
      await upsertPartnerSettings(updates);
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الدفع" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <CreditCard className="w-6 h-6" />
        إعدادات الدفع
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">خيارات الدفع للعملاء</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Banknote className="w-5 h-5 text-green-600" />
              <div>
                <Label className="text-base font-medium">الدفع عند الاستلام</Label>
                <p className="text-sm text-muted-foreground">
                  السماح للعملاء بالدفع نقداً عند استلام الطرد أو الطلب
                </p>
              </div>
            </div>
            <Switch
              checked={cashOnDelivery}
              onCheckedChange={(v) => handleSave("cash_on_delivery_enabled", v)}
              disabled={saving}
            />
          </div>

          {(role === "driver" || role === "supplier") && (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-blue-600" />
                <div>
                  <Label className="text-base font-medium">الدفع عند الركوب</Label>
                  <p className="text-sm text-muted-foreground">
                    السماح للعملاء بالدفع نقداً عند ركوب السيارة
                  </p>
                </div>
              </div>
              <Switch
                checked={cashOnRide}
                onCheckedChange={(v) => handleSave("cash_on_ride_enabled", v)}
                disabled={saving}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <Label className="text-base font-medium">الدفع المباشر</Label>
                <p className="text-sm text-muted-foreground">
                  السماح للعملاء بالتحويل مباشرة إلى حساباتك البنكية
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={directPaymentAllowed} disabled />
              <span className="text-xs text-muted-foreground">
                {directPaymentAllowed ? "مفعّل (بواسطة الإدارة)" : "معطّل (بواسطة الإدارة)"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerPaymentSettings;
