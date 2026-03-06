import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Shield, Settings2, FileText, Calculator } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminSettings, updateAdminSetting, getPrivacyPolicies, upsertPrivacyPolicy, createAuditLog } from "@/lib/adminApi";
import { getAccountingSettings, updateAccountingSettings } from "@/lib/accountingApi";
import { supabase } from "@/integrations/supabase/client";

type SettingItem = { key: string; value: string; description: string | null };

const AdminSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyRole, setPolicyRole] = useState("customer");
  const [policyContent, setPolicyContent] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Accounting settings
  const [acctSettings, setAcctSettings] = useState<any>(null);
  const [savingAcct, setSavingAcct] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [settingsRes, policiesRes] = await Promise.all([
        supabase.from("admin_settings").select("key, value, description").order("key"),
        getPrivacyPolicies(),
      ]);
      setSettings(settingsRes.data || []);
      const policies = policiesRes.data || [];
      const customerPolicy = policies.find((p: any) => p.role === "customer");
      if (customerPolicy) setPolicyContent(customerPolicy.content);

      try {
        const acct = await getAccountingSettings();
        setAcctSettings(acct);
      } catch { /* no settings yet */ }

      setLoading(false);
    };
    fetchAll();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    for (const s of settings) {
      await updateAdminSetting(s.key, s.value, user.id);
    }
    createAuditLog(user.id, "تحديث إعدادات النظام");
    toast.success("تم حفظ الإعدادات بنجاح");
    setSaving(false);
  };

  const handlePolicyRoleChange = async (role: string) => {
    setPolicyRole(role);
    const { data } = await getPrivacyPolicies();
    const policy = (data || []).find((p: any) => p.role === role);
    setPolicyContent(policy?.content || "");
  };

  const handleSavePolicy = async () => {
    if (!user) return;
    setSavingPolicy(true);
    const { error } = await upsertPrivacyPolicy(policyRole, policyContent);
    if (error) { toast.error("فشل الحفظ"); setSavingPolicy(false); return; }
    createAuditLog(user.id, "تحديث سياسة الخصوصية", "privacy_policy", undefined, { role: policyRole });
    toast.success("تم حفظ سياسة الخصوصية");
    setSavingPolicy(false);
  };

  const handleSaveAccounting = async () => {
    if (!user || !acctSettings) return;
    setSavingAcct(true);
    const { error } = await updateAccountingSettings({
      global_commission_booking: acctSettings.global_commission_booking,
      global_commission_delivery: acctSettings.global_commission_delivery,
      global_commission_shipment: acctSettings.global_commission_shipment,
      global_commission_ride: acctSettings.global_commission_ride,
      payment_due_days: acctSettings.payment_due_days,
      auto_suspend_days: acctSettings.auto_suspend_days,
      currency: acctSettings.currency,
    });
    if (error) { toast.error("فشل الحفظ"); setSavingAcct(false); return; }
    createAuditLog(user.id, "تحديث إعدادات المحاسبة");
    toast.success("تم حفظ إعدادات المحاسبة");
    setSavingAcct(false);
  };

  const commissionSettings = settings.filter((s) => s.key.includes("commission"));
  const booleanSettings = settings.filter((s) => s.value === "true" || s.value === "false");
  const otherSettings = settings.filter((s) => !s.key.includes("commission") && s.value !== "true" && s.value !== "false");

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الإعدادات</h2>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general"><Settings2 className="w-4 h-4 ml-1" />عامة</TabsTrigger>
          <TabsTrigger value="accounting"><Calculator className="w-4 h-4 ml-1" />المحاسبة</TabsTrigger>
          <TabsTrigger value="approvals"><Shield className="w-4 h-4 ml-1" />الموافقات</TabsTrigger>
          <TabsTrigger value="privacy"><FileText className="w-4 h-4 ml-1" />سياسة الخصوصية</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          {commissionSettings.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">نسب العمولة (إعدادات قديمة)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {commissionSettings.map((s) => (
                  <div key={s.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="sm:w-48 text-sm">{s.description || s.key}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="0" max="100" value={s.value} onChange={(e) => updateSetting(s.key, e.target.value)} className="w-24" />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {otherSettings.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">إعدادات أخرى</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {otherSettings.map((s) => (
                  <div key={s.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="sm:w-48 text-sm">{s.description || s.key}</Label>
                    <Input value={s.value} onChange={(e) => updateSetting(s.key, e.target.value)} className="max-w-xs" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Button onClick={handleSaveSettings} disabled={saving}><Save className="w-4 h-4 ml-2" />{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</Button>
        </TabsContent>

        {/* Accounting Tab */}
        <TabsContent value="accounting" className="mt-4 space-y-4">
          {acctSettings ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">نسب العمولة لكل خدمة</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: "global_commission_booking", label: "عمولة الحجوزات" },
                    { key: "global_commission_delivery", label: "عمولة التوصيل" },
                    { key: "global_commission_shipment", label: "عمولة الشحنات" },
                    { key: "global_commission_ride", label: "عمولة الأجرة" },
                  ].map((item) => (
                    <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Label className="sm:w-48 text-sm">{item.label}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" min="0" max="100"
                          value={acctSettings[item.key]}
                          onChange={(e) => setAcctSettings({ ...acctSettings, [item.key]: Number(e.target.value) })}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">إعدادات الاستحقاق والحظر</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="sm:w-48 text-sm">مدة استحقاق الدفع</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="1" max="90"
                        value={acctSettings.payment_due_days}
                        onChange={(e) => setAcctSettings({ ...acctSettings, payment_due_days: Number(e.target.value) })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">يوم</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="sm:w-48 text-sm">مدة التأخير قبل الحظر</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min="1" max="90"
                        value={acctSettings.auto_suspend_days}
                        onChange={(e) => setAcctSettings({ ...acctSettings, auto_suspend_days: Number(e.target.value) })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">يوم</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="sm:w-48 text-sm">العملة الأساسية</Label>
                    <Select value={acctSettings.currency} onValueChange={(v) => setAcctSettings({ ...acctSettings, currency: v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YER">ر.ي (YER)</SelectItem>
                        <SelectItem value="SAR">ر.س (SAR)</SelectItem>
                        <SelectItem value="USD">$ (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveAccounting} disabled={savingAcct}>
                <Save className="w-4 h-4 ml-2" />{savingAcct ? "جاري الحفظ..." : "حفظ إعدادات المحاسبة"}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">لم يتم تحميل إعدادات المحاسبة</p>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">إعدادات الموافقة التلقائية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {booleanSettings.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <Label className="text-sm">{s.description || s.key}</Label>
                  <Switch checked={s.value === "true"} onCheckedChange={(checked) => updateSetting(s.key, checked ? "true" : "false")} />
                </div>
              ))}
              {booleanSettings.length === 0 && <p className="text-sm text-muted-foreground">لا توجد إعدادات موافقة تلقائية حالياً</p>}
            </CardContent>
          </Card>
          <Button onClick={handleSaveSettings} disabled={saving}><Save className="w-4 h-4 ml-2" />{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</Button>
        </TabsContent>

        <TabsContent value="privacy" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">محرر سياسة الخصوصية</CardTitle>
                <Select value={policyRole} onValueChange={handlePolicyRoleChange}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">العملاء</SelectItem>
                    <SelectItem value="supplier">الموردون</SelectItem>
                    <SelectItem value="delivery_company">شركات التوصيل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[300px] font-mono text-sm"
                value={policyContent}
                onChange={(e) => setPolicyContent(e.target.value)}
                placeholder="أدخل سياسة الخصوصية هنا..."
                dir="rtl"
              />
            </CardContent>
          </Card>
          <Button onClick={handleSavePolicy} disabled={savingPolicy}><Save className="w-4 h-4 ml-2" />{savingPolicy ? "جاري الحفظ..." : "حفظ السياسة"}</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
