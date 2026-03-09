import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Volume2, Smartphone, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/landing/Header";

interface NotificationSettings {
  enable_push_notifications: boolean;
  enable_sound: boolean;
  vibration_enabled: boolean;
  notify_trip_reminders: boolean;
  notify_shipment_updates: boolean;
  notify_delivery_updates: boolean;
  notify_ride_requests: boolean;
  notify_promotions: boolean;
  notify_payments: boolean;
  notification_sound: string;
}

const defaultSettings: NotificationSettings = {
  enable_push_notifications: true,
  enable_sound: true,
  vibration_enabled: true,
  notify_trip_reminders: true,
  notify_shipment_updates: true,
  notify_delivery_updates: true,
  notify_ride_requests: true,
  notify_promotions: true,
  notify_payments: true,
  notification_sound: "default",
};

const NotificationSettingsPage = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          enable_push_notifications: data.enable_push_notifications ?? true,
          enable_sound: data.enable_sound ?? true,
          vibration_enabled: data.vibration_enabled ?? true,
          notify_trip_reminders: data.notify_trip_reminders ?? true,
          notify_shipment_updates: data.notify_shipment_updates ?? true,
          notify_delivery_updates: data.notify_delivery_updates ?? true,
          notify_ride_requests: data.notify_ride_requests ?? true,
          notify_promotions: data.notify_promotions ?? true,
          notify_payments: data.notify_payments ?? true,
          notification_sound: data.notification_sound ?? "default",
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("notification_settings")
      .upsert({ user_id: user.id, ...settings, updated_at: new Date().toISOString() } as any, { onConflict: "user_id" });

    if (error) {
      toast.error("فشل حفظ الإعدادات");
    } else {
      toast.success("تم حفظ الإعدادات بنجاح");
    }
    setSaving(false);
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="pt-20 flex justify-center items-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">جاري التحميل...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="pt-20 pb-10 container mx-auto px-4 max-w-2xl" dir="rtl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          إعدادات الإشعارات
        </h1>

        <div className="space-y-4">
          {/* Master toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                الإشعارات العامة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="push">استلام الإشعارات</Label>
                <Switch id="push" checked={settings.enable_push_notifications} onCheckedChange={(v) => updateSetting("enable_push_notifications", v)} />
              </div>
            </CardContent>
          </Card>

          {settings.enable_push_notifications && (
            <>
              {/* Notification types */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">أنواع الإشعارات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>تذكير بالرحلات</Label>
                    <Switch checked={settings.notify_trip_reminders} onCheckedChange={(v) => updateSetting("notify_trip_reminders", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>تحديثات الطرود</Label>
                    <Switch checked={settings.notify_shipment_updates} onCheckedChange={(v) => updateSetting("notify_shipment_updates", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>تحديثات التوصيل</Label>
                    <Switch checked={settings.notify_delivery_updates} onCheckedChange={(v) => updateSetting("notify_delivery_updates", v)} />
                  </div>
                  {role === "driver" && (
                    <div className="flex items-center justify-between">
                      <Label>طلبات أجرة جديدة</Label>
                      <Switch checked={settings.notify_ride_requests} onCheckedChange={(v) => updateSetting("notify_ride_requests", v)} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>العروض الترويجية</Label>
                    <Switch checked={settings.notify_promotions} onCheckedChange={(v) => updateSetting("notify_promotions", v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>تأكيدات الدفع</Label>
                    <Switch checked={settings.notify_payments} onCheckedChange={(v) => updateSetting("notify_payments", v)} />
                  </div>
                </CardContent>
              </Card>

              {/* Sound settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Volume2 className="w-5 h-5" />
                    إعدادات الصوت
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>تشغيل الصوت</Label>
                    <Switch checked={settings.enable_sound} onCheckedChange={(v) => updateSetting("enable_sound", v)} />
                  </div>
                  {settings.enable_sound && (
                    <div className="space-y-2">
                      <Label>نغمة الإشعار</Label>
                      <Select value={settings.notification_sound} onValueChange={(v) => updateSetting("notification_sound", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">افتراضي</SelectItem>
                          <SelectItem value="trip_reminder">تذكير رحلة</SelectItem>
                          <SelectItem value="new_shipment">شحنة جديدة</SelectItem>
                          <SelectItem value="promotion">عرض ترويجي</SelectItem>
                          <SelectItem value="payment_success">تأكيد دفع</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label>الاهتزاز</Label>
                    <Switch checked={settings.vibration_enabled} onCheckedChange={(v) => updateSetting("vibration_enabled", v)} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotificationSettingsPage;
