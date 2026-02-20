import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type SettingItem = {
  key: string;
  value: string;
  description: string | null;
};

const AdminSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("admin_settings").select("key, value, description").order("key");
      setSettings(data || []);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const s of settings) {
      await supabase
        .from("admin_settings")
        .update({ value: s.value, updated_by: user?.id })
        .eq("key", s.key);
    }
    toast.success("تم حفظ الإعدادات بنجاح");
    setSaving(false);
  };

  const commissionSettings = settings.filter((s) => s.key.includes("commission"));
  const booleanSettings = settings.filter((s) => s.key.startsWith("auto_"));

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">الإعدادات</h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 ml-2" />
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">نسب العمولة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {commissionSettings.map((s) => (
            <div key={s.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Label className="sm:w-48 text-sm">{s.description || s.key}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={s.value}
                  onChange={(e) => updateSetting(s.key, e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Auto-approve Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">إعدادات الموافقة التلقائية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {booleanSettings.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <div>
                <Label className="text-sm">{s.description || s.key}</Label>
              </div>
              <Switch
                checked={s.value === "true"}
                onCheckedChange={(checked) => updateSetting(s.key, checked ? "true" : "false")}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
