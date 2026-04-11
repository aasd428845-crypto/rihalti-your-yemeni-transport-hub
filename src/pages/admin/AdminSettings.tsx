import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Shield, Settings2, FileText, Calculator, Building2, Plus, Trash2, LayoutGrid, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminSettings, updateAdminSetting, getPrivacyPolicies, upsertPrivacyPolicy, createAuditLog } from "@/lib/adminApi";
import { getAccountingSettings, updateAccountingSettings } from "@/lib/accountingApi";
import { supabase } from "@/integrations/supabase/client";

type SettingItem = { key: string; value: string; description: string | null };
type BankAccount = { id: string; bank_name: string; account_name: string; account_number: string; iban: string | null; swift_code: string | null; is_active: boolean; is_primary: boolean; notes: string | null };

const AdminSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policyRole, setPolicyRole] = useState("customer");
  const [policyContent, setPolicyContent] = useState("");
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [acctSettings, setAcctSettings] = useState<any>(null);
  const [savingAcct, setSavingAcct] = useState(false);
  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankModal, setBankModal] = useState(false);
  const [editBank, setEditBank] = useState<Partial<BankAccount>>({});
  const [savingBank, setSavingBank] = useState(false);

  // Dynamic Categories
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [cuisines, setCuisines] = useState<any[]>([]);
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<any>({});
  const [catType, setCatType] = useState<"service" | "cuisine">("service");
  const [savingCat, setSavingCat] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [settingsRes, policiesRes, banksRes, servicesRes, cuisinesRes] = await Promise.all([
        supabase.from("admin_settings").select("key, value, description").order("key"),
        getPrivacyPolicies(),
        supabase.from("platform_bank_accounts" as any).select("*").order("is_primary", { ascending: false }),
        supabase.from("service_types" as any).select("*").order("sort_order"),
        supabase.from("restaurant_cuisines" as any).select("*").order("sort_order"),
      ]);
      setSettings(settingsRes.data || []);
      const policies = policiesRes.data || [];
      const customerPolicy = policies.find((p: any) => p.role === "customer");
      if (customerPolicy) setPolicyContent(customerPolicy.content);
      setBankAccounts((banksRes.data || []) as BankAccount[]);
      setServiceTypes(servicesRes.data || []);
      setCuisines(cuisinesRes.data || []);

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

  // Bank account handlers
  const openAddBank = () => {
    setEditBank({ bank_name: "", account_name: "", account_number: "", iban: "", swift_code: "", is_active: true, is_primary: false, notes: "" });
    setBankModal(true);
  };

  const openEditBank = (b: BankAccount) => {
    setEditBank({ ...b });
    setBankModal(true);
  };

  const handleSaveBank = async () => {
    if (!user || !editBank.bank_name || !editBank.account_name || !editBank.account_number) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setSavingBank(true);
    const payload = {
      bank_name: editBank.bank_name,
      account_name: editBank.account_name,
      account_number: editBank.account_number,
      iban: editBank.iban || null,
      swift_code: editBank.swift_code || null,
      is_active: editBank.is_active ?? true,
      is_primary: editBank.is_primary ?? false,
      notes: editBank.notes || null,
      updated_at: new Date().toISOString(),
    };

    let error: any;
    if (editBank.id) {
      const res = await supabase.from("platform_bank_accounts").update(payload).eq("id", editBank.id);
      error = res.error;
    } else {
      const res = await supabase.from("platform_bank_accounts").insert(payload);
      error = res.error;
    }

    if (error) { toast.error("فشل الحفظ"); setSavingBank(false); return; }
    createAuditLog(user.id, editBank.id ? "تعديل حساب بنكي للمنصة" : "إضافة حساب بنكي للمنصة", "platform_bank_account");
    toast.success("تم الحفظ بنجاح");
    setBankModal(false);
    setSavingBank(false);
    // Refresh
    const { data } = await supabase.from("platform_bank_accounts").select("*").order("is_primary", { ascending: false });
    setBankAccounts((data || []) as BankAccount[]);
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
    await supabase.from("platform_bank_accounts").delete().eq("id", id);
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
    toast.success("تم الحذف");
    if (user) createAuditLog(user.id, "حذف حساب بنكي للمنصة", "platform_bank_account", id);
  };

  // Dynamic Categories Handlers
  const openAddCat = (type: "service" | "cuisine") => {
    setCatType(type);
    setEditCat({ name_ar: "", image_url: "", sort_order: 0 });
    setCatModal(true);
  };

  const openEditCat = (cat: any, type: "service" | "cuisine") => {
    setCatType(type);
    setEditCat({ ...cat });
    setCatModal(true);
  };

  const handleSaveCat = async () => {
    if (!editCat.name_ar) { toast.error("الاسم مطلوب"); return; }
    setSavingCat(true);
    const table = catType === "service" ? "service_types" : "restaurant_cuisines";
    const payload = {
      name_ar: editCat.name_ar,
      image_url: editCat.image_url || null,
      sort_order: Number(editCat.sort_order || 0),
    };

    let error;
    if (editCat.id) {
      const res = await (supabase.from(table as any).update(payload).eq("id", editCat.id) as any);
      error = res.error;
    } else {
      const res = await (supabase.from(table as any).insert(payload) as any);
      error = res.error;
    }

    if (error) { toast.error("فشل الحفظ"); setSavingCat(false); return; }
    toast.success("تم الحفظ بنجاح");
    setCatModal(false);
    setSavingCat(false);
    // Refresh
    const [sRes, cRes] = await Promise.all([
      supabase.from("service_types" as any).select("*").order("sort_order"),
      supabase.from("restaurant_cuisines" as any).select("*").order("sort_order"),
    ]) as any;
    setServiceTypes(sRes.data || []);
    setCuisines(cRes.data || []);
  };

  const handleDeleteCat = async (id: string, type: "service" | "cuisine") => {
    if (!confirm("هل أنت متأكد؟")) return;
    const table = type === "service" ? "service_types" : "restaurant_cuisines";
    await (supabase.from(table as any).delete().eq("id", id) as any);
    if (type === "service") setServiceTypes(prev => prev.filter(c => c.id !== id));
    else setCuisines(prev => prev.filter(c => c.id !== id));
    toast.success("تم الحذف");
  };

  const commissionSettings = settings.filter((s) => s.key.includes("commission"));
  const otherSettings = settings.filter((s) => !s.key.includes("commission") && s.value !== "true" && s.value !== "false");

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الإعدادات</h2>

      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="general"><Settings2 className="w-4 h-4 ml-1" />عامة</TabsTrigger>
          <TabsTrigger value="categories"><LayoutGrid className="w-4 h-4 ml-1" />التصنيفات</TabsTrigger>
          <TabsTrigger value="accounting"><Calculator className="w-4 h-4 ml-1" />المحاسبة</TabsTrigger>
          <TabsTrigger value="privacy"><FileText className="w-4 h-4 ml-1" />سياسة الخصوصية</TabsTrigger>
          <TabsTrigger value="bank_accounts"><Building2 className="w-4 h-4 ml-1" />حسابات الدفع</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-4 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">تصنيفات الخدمات (الأيقونات العلوية)</CardTitle>
              <Button size="sm" onClick={() => openAddCat("service")}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {serviceTypes.map((cat) => (
                  <div key={cat.id} className="relative group border rounded-xl p-3 text-center bg-muted/20">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-white">
                      {cat.image_url ? <img src={cat.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-2 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-bold truncate">{cat.name_ar}</p>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                      <Button size="icon" variant="secondary" className="w-7 h-7" onClick={() => openEditCat(cat, "service")}><Settings2 className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="destructive" className="w-7 h-7" onClick={() => handleDeleteCat(cat.id, "service")}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">تصنيفات المطاعم (يمني، برجر، إلخ)</CardTitle>
              <Button size="sm" onClick={() => openAddCat("cuisine")}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {cuisines.map((cat) => (
                  <div key={cat.id} className="relative group border rounded-xl p-3 text-center bg-muted/20">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-lg overflow-hidden bg-white">
                      {cat.image_url ? <img src={cat.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-2 text-muted-foreground" />}
                    </div>
                    <p className="text-xs font-bold truncate">{cat.name_ar}</p>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                      <Button size="icon" variant="secondary" className="w-7 h-7" onClick={() => openEditCat(cat, "cuisine")}><Settings2 className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="destructive" className="w-7 h-7" onClick={() => handleDeleteCat(cat.id, "cuisine")}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
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
          {acctSettings && (
            <Card>
              <CardHeader><CardTitle className="text-base">نسب العمولة لكل خدمة</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "global_commission_booking", label: "عمولة الحجوزات" },
                  { key: "global_commission_delivery", label: "عمولة التوصيل" },
                  { key: "global_commission_shipment", label: "عمولة الطرود" },
                  { key: "global_commission_ride", label: "عمولة الأجرة" },
                ].map((item) => (
                  <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Label className="sm:w-48 text-sm">{item.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="0" max="100" value={acctSettings[item.key]} onChange={(e) => setAcctSettings({ ...acctSettings, [item.key]: Number(e.target.value) })} className="w-24" />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
                <Button onClick={handleSaveAccounting} disabled={savingAcct} className="mt-2"><Save className="w-4 h-4 ml-2" />{savingAcct ? "جاري الحفظ..." : "حفظ إعدادات المحاسبة"}</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">سياسة الخصوصية والشروط</CardTitle>
              <Select value={policyRole} onValueChange={handlePolicyRoleChange}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">العميل</SelectItem>
                  <SelectItem value="supplier">المورد</SelectItem>
                  <SelectItem value="delivery_company">شركة التوصيل</SelectItem>
                  <SelectItem value="driver">السائق</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={policyContent} onChange={(e) => setPolicyContent(e.target.value)} className="min-h-[300px] text-sm leading-relaxed" placeholder="اكتب سياسة الخصوصية هنا..." />
              <Button onClick={handleSavePolicy} disabled={savingPolicy}><Save className="w-4 h-4 ml-2" />{savingPolicy ? "جاري الحفظ..." : "حفظ السياسة"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="bank_accounts" className="mt-4 space-y-4">
          <div className="flex justify-end"><Button onClick={openAddBank}><Plus className="w-4 h-4 ml-1" />إضافة حساب بنكي</Button></div>
          <div className="grid md:grid-cols-2 gap-4">
            {bankAccounts.map((b) => (
              <Card key={b.id} className={b.is_primary ? "border-primary/50 shadow-sm" : ""}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold">{b.bank_name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => openEditBank(b)}><Settings2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="w-8 h-8 text-destructive" onClick={() => handleDeleteBank(b.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">الاسم:</span> {b.account_name}</p>
                  <p><span className="text-muted-foreground">الرقم:</span> {b.account_number}</p>
                  {b.is_primary && <Badge className="mt-2">حساب أساسي</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Modal */}
      <Dialog open={catModal} onOpenChange={setCatModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCat.id ? "تعديل تصنيف" : "إضافة تصنيف جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>الاسم (بالعربية)</Label><Input value={editCat.name_ar} onChange={(e) => setEditCat({ ...editCat, name_ar: e.target.value })} /></div>
            <div className="space-y-2"><Label>رابط الصورة</Label><Input value={editCat.image_url} onChange={(e) => setEditCat({ ...editCat, image_url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-2"><Label>الترتيب</Label><Input type="number" value={editCat.sort_order} onChange={(e) => setEditCat({ ...editCat, sort_order: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCatModal(false)}>إلغاء</Button><Button onClick={handleSaveCat} disabled={savingCat}>{savingCat ? "جاري الحفظ..." : "حفظ"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Modal */}
      <Dialog open={bankModal} onOpenChange={setBankModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editBank.id ? "تعديل حساب بنكي" : "إضافة حساب بنكي"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2"><Label>اسم البنك</Label><Input value={editBank.bank_name} onChange={(e) => setEditBank({ ...editBank, bank_name: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>اسم الحساب</Label><Input value={editBank.account_name} onChange={(e) => setEditBank({ ...editBank, account_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>رقم الحساب</Label><Input value={editBank.account_number} onChange={(e) => setEditBank({ ...editBank, account_number: e.target.value })} /></div>
            <div className="space-y-2"><Label>IBAN</Label><Input value={editBank.iban} onChange={(e) => setEditBank({ ...editBank, iban: e.target.value })} /></div>
            <div className="flex items-center gap-2 mt-4"><Switch checked={editBank.is_primary} onCheckedChange={(val) => setEditBank({ ...editBank, is_primary: val })} /><Label>حساب أساسي</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setBankModal(false)}>إلغاء</Button><Button onClick={handleSaveBank} disabled={savingBank}>{savingBank ? "جاري الحفظ..." : "حفظ"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
