import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DeleteAccountButton from "@/components/common/DeleteAccountButton";
import { Navigation } from "lucide-react";

const DeliverySettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", city: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [bankForm, setBankForm] = useState({ bank_name: "", account_name: "", account_number: "", iban: "" });
  const [banks, setBanks] = useState<any[]>([]);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [minDeliveryFee, setMinDeliveryFee] = useState<number>(0);
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name, phone: profile.phone || "", city: profile.city || "" });
    loadBanks();
    loadPaymentSettings();
  }, [profile]);

  const loadBanks = async () => {
    if (!user) return;
    const { data } = await supabase.from("partner_bank_accounts").select("*").eq("partner_id", user.id);
    setBanks(data || []);
  };

  const loadPaymentSettings = async () => {
    if (!user) return;
    const { data } = await supabase.from("partner_settings" as any).select("*").eq("partner_id", user.id).maybeSingle();
    if (data) {
      setCashEnabled((data as any).cash_on_delivery_enabled ?? true);
      setPricePerKm(Number((data as any).price_per_km ?? 0));
      setMinDeliveryFee(Number((data as any).min_delivery_fee ?? 0));
    }
  };

  const updateProfile = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update(profileForm).eq("user_id", user.id);
      toast({ title: "تم تحديث الملف الشخصي" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const changePassword = async () => {
    if (passwordForm.password !== passwordForm.confirm) {
      toast({ title: "كلمتا المرور غير متطابقتان", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
      if (error) throw error;
      toast({ title: "تم تغيير كلمة المرور" });
      setPasswordForm({ password: "", confirm: "" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const addBank = async () => {
    if (!user || !bankForm.bank_name || !bankForm.account_number) return;
    try {
      await supabase.from("partner_bank_accounts").insert({ ...bankForm, partner_id: user.id });
      toast({ title: "تمت إضافة الحساب البنكي" });
      setBankForm({ bank_name: "", account_name: "", account_number: "", iban: "" });
      loadBanks();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const deleteBank = async (id: string) => {
    try {
      await supabase.from("partner_bank_accounts").delete().eq("id", id);
      toast({ title: "تم حذف الحساب" });
      loadBanks();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const toggleCash = async (enabled: boolean) => {
    if (!user) return;
    setCashEnabled(enabled);
    try {
      await supabase.from("partner_settings" as any).upsert({
        partner_id: user.id,
        cash_on_delivery_enabled: enabled,
        updated_at: new Date().toISOString(),
      }, { onConflict: "partner_id" });
      toast({ title: enabled ? "تم تفعيل الدفع النقدي" : "تم إيقاف الدفع النقدي" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const savePricing = async () => {
    if (!user) return;
    setSavingPricing(true);
    try {
      await supabase.from("partner_settings" as any).upsert({
        partner_id: user.id,
        price_per_km: pricePerKm,
        min_delivery_fee: minDeliveryFee,
        updated_at: new Date().toISOString(),
      }, { onConflict: "partner_id" });
      toast({ title: "تم حفظ إعدادات التسعير", description: pricePerKm > 0 ? `سعر الكيلومتر: ${pricePerKm} ر.ي` : "تم إيقاف التسعير بالمسافة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSavingPricing(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">الإعدادات</h2>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          <TabsTrigger value="password">كلمة المرور</TabsTrigger>
          <TabsTrigger value="banks">الحسابات البنكية</TabsTrigger>
          <TabsTrigger value="payment">خيارات الدفع</TabsTrigger>
          <TabsTrigger value="pricing">تسعير التوصيل</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">الملف الشخصي</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>الاسم الكامل</Label><Input value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} /></div>
              <div><Label>رقم الهاتف</Label><Input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} /></div>
              <div><Label>المدينة</Label><Input value={profileForm.city} onChange={e => setProfileForm({...profileForm, city: e.target.value})} /></div>
              <Button onClick={updateProfile}>حفظ التغييرات</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader><CardTitle className="text-base">تغيير كلمة المرور</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>كلمة المرور الجديدة</Label><Input type="password" value={passwordForm.password} onChange={e => setPasswordForm({...passwordForm, password: e.target.value})} /></div>
              <div><Label>تأكيد كلمة المرور</Label><Input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} /></div>
              <Button onClick={changePassword}>تغيير كلمة المرور</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banks">
          <Card>
            <CardHeader><CardTitle className="text-base">الحسابات البنكية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {banks.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{b.bank_name} - {b.account_name}</p>
                    <p className="text-sm text-muted-foreground">{b.account_number} {b.iban && `| IBAN: ${b.iban}`}</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => deleteBank(b.id)}>حذف</Button>
                </div>
              ))}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium">إضافة حساب بنكي</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>اسم البنك</Label><Input value={bankForm.bank_name} onChange={e => setBankForm({...bankForm, bank_name: e.target.value})} /></div>
                  <div><Label>اسم صاحب الحساب</Label><Input value={bankForm.account_name} onChange={e => setBankForm({...bankForm, account_name: e.target.value})} /></div>
                  <div><Label>رقم الحساب</Label><Input value={bankForm.account_number} onChange={e => setBankForm({...bankForm, account_number: e.target.value})} /></div>
                  <div><Label>IBAN</Label><Input value={bankForm.iban} onChange={e => setBankForm({...bankForm, iban: e.target.value})} /></div>
                </div>
                <Button onClick={addBank}>إضافة حساب</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader><CardTitle className="text-base">خيارات الدفع للعملاء</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">الدفع نقداً عند الاستلام</p>
                  <p className="text-sm text-muted-foreground">السماح للعملاء بالدفع نقداً للمندوب</p>
                </div>
                <Switch checked={cashEnabled} onCheckedChange={toggleCash} />
              </div>
              {!cashEnabled && (
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ عند إيقاف الدفع النقدي، سيُلزم العملاء بالتحويل البنكي فقط. تأكد من إضافة حساباتك البنكية في تبويب "الحسابات البنكية".
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                التسعير بالمسافة (Distance-based Pricing)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-semibold">كيف يعمل هذا النظام؟</p>
                <p>يحسب رسوم التوصيل تلقائياً بضرب المسافة الجوية بين المطعم وعنوان العميل في سعر الكيلومتر الذي تحدده.</p>
                <p className="text-blue-600 dark:text-blue-400">مثال: مسافة 5 كم × 250 ر.ي = 1250 ر.ي رسوم توصيل</p>
                <p className="mt-1">⚠️ يلزم إدخال إحداثيات GPS لكل مطعم من قسم المطاعم لتفعيل هذا النظام.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">سعر الكيلومتر الواحد (ر.ي)</Label>
                  <p className="text-xs text-muted-foreground mb-2">اضبطه على 0 لإيقاف التسعير بالمسافة والعودة للسعر الثابت</p>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={pricePerKm}
                    onChange={e => setPricePerKm(Number(e.target.value))}
                    placeholder="مثال: 250"
                    className="max-w-xs"
                  />
                </div>

                <div>
                  <Label className="text-sm font-semibold">الحد الأدنى لرسوم التوصيل (ر.ي)</Label>
                  <p className="text-xs text-muted-foreground mb-2">لن تقل رسوم التوصيل عن هذا المبلغ حتى لو كانت المسافة قريبة</p>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={minDeliveryFee}
                    onChange={e => setMinDeliveryFee(Number(e.target.value))}
                    placeholder="مثال: 500"
                    className="max-w-xs"
                  />
                </div>

                {pricePerKm > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
                    ✅ التسعير بالمسافة مفعّل — {pricePerKm} ر.ي/كم
                    {minDeliveryFee > 0 && ` — حد أدنى ${minDeliveryFee} ر.ي`}
                  </div>
                )}

                <Button onClick={savePricing} disabled={savingPricing}>
                  {savingPricing ? "جاري الحفظ..." : "حفظ إعدادات التسعير"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteAccountButton />
    </div>
  );
};

export default DeliverySettings;
