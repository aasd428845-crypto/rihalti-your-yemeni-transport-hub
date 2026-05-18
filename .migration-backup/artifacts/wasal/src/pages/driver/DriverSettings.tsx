import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Volume2, Vibrate, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import DeleteAccountButton from "@/components/common/DeleteAccountButton";

const DriverSettings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
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
      setSettings(data || {
        enable_push_notifications: true,
        enable_sound: true,
        vibration_enabled: true,
        notify_ride_requests: true,
        notify_payments: true,
      });
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updateSetting = async (key: string, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    if (settings?.id) {
      await supabase.from("notification_settings").update({ [key]: value } as any).eq("id", settings.id);
    } else {
      const { data } = await supabase
        .from("notification_settings")
        .insert({ user_id: user!.id, ...updated } as any)
        .select()
        .single();
      if (data) setSettings(data);
    }
    setSaving(false);
    toast({ title: "تم الحفظ" });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const toggleItems = [
    { key: "enable_push_notifications", label: "الإشعارات الفورية", icon: Bell },
    { key: "enable_sound", label: "الأصوات", icon: Volume2 },
    { key: "vibration_enabled", label: "الاهتزاز", icon: Vibrate },
    { key: "notify_ride_requests", label: "إشعارات الطلبات الجديدة", icon: Bell },
    { key: "notify_payments", label: "إشعارات المدفوعات", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إعدادات الإشعارات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {toggleItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-primary" />
                <Label className="text-sm text-foreground">{item.label}</Label>
              </div>
              <Switch
                checked={settings?.[item.key] ?? true}
                onCheckedChange={(val) => updateSetting(item.key, val)}
                disabled={saving}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountButton />
    </div>
  );
};

export default DriverSettings;
