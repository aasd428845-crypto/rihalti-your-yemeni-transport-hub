import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, getSupplierBankAccounts, addBankAccount, deleteBankAccount, getSupplierWorkingAreas, updateWorkingAreas, getRegions } from "@/lib/supplierApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Lock, Upload, User, Building, MapPinned } from "lucide-react";
import type { Region } from "@/types/supplier.types";

const SupplierSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Profile
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({ bank_name: "", account_name: "", account_number: "", iban: "" });

  // Working areas
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);

  // Yemeni cities for city dropdown
  const yemenRegion = regions.find(r => r.name_ar === "اليمن" && r.type === "country");
  const yemeniCities = regions.filter(r => r.parent_id === yemenRegion?.id);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    const [banksRes, areasRes, regionsRes, profileRes] = await Promise.all([
      getSupplierBankAccounts(user!.id),
      getSupplierWorkingAreas(user!.id),
      getRegions(),
      supabase.from("profiles").select("logo_url").eq("user_id", user!.id).single(),
    ]);
    setBankAccounts(banksRes.data || []);
    setSelectedRegions((areasRes.data || []).map((a: any) => a.region_id));
    setRegions(regionsRes.data || []);
    if (profileRes.data?.logo_url) setLogoUrl(profileRes.data.logo_url);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `supplier-${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("profile-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("profile-logos").getPublicUrl(path);
      await supabase.from("profiles").update({ logo_url: urlData.publicUrl }).eq("user_id", user.id);
      setLogoUrl(urlData.publicUrl);
      toast({ title: "تم رفع الشعار بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSave = async () => {
    const { error } = await updateProfile(user!.id, { full_name: fullName, phone, city });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else toast({ title: "تم حفظ الملف الشخصي" });
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "كلمة المرور غير متطابقة", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "كلمة المرور قصيرة جداً", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم تغيير كلمة المرور" }); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleAddBank = async () => {
    if (!newBank.bank_name || !newBank.account_number) return;
    const { error } = await addBankAccount({ ...newBank, partner_id: user!.id });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تمت إضافة الحساب البنكي" }); setNewBank({ bank_name: "", account_name: "", account_number: "", iban: "" }); loadAll(); }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الحساب؟")) return;
    await deleteBankAccount(id);
    toast({ title: "تم حذف الحساب" });
    loadAll();
  };

  const handleSaveAreas = async () => {
    const result = await updateWorkingAreas(user!.id, selectedRegions);
    if (result?.error) toast({ title: "خطأ", description: result.error.message, variant: "destructive" });
    else toast({ title: "تم حفظ المناطق" });
  };

  const toggleRegion = (regionId: number) => {
    setSelectedRegions(prev => prev.includes(regionId) ? prev.filter(r => r !== regionId) : [...prev, regionId]);
  };

  // Group regions by country for display
  const countryRegions = regions.filter(r => r.type === "country");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الإعدادات</h2>

      <Tabs defaultValue="profile" dir="rtl">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="profile" className="gap-1"><User className="w-3.5 h-3.5" /> الملف الشخصي</TabsTrigger>
          <TabsTrigger value="password" className="gap-1"><Lock className="w-3.5 h-3.5" /> كلمة المرور</TabsTrigger>
          <TabsTrigger value="banks" className="gap-1"><Building className="w-3.5 h-3.5" /> الحسابات البنكية</TabsTrigger>
          <TabsTrigger value="areas" className="gap-1"><MapPinned className="w-3.5 h-3.5" /> مناطق العمل</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">الملف الشخصي</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Logo */}
              <div>
                <Label>الشعار / الصورة العامة</Label>
                <div className="flex items-center gap-4 mt-2">
                  <input type="file" accept="image/*" ref={logoInputRef} className="hidden" onChange={handleLogoUpload} />
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploading} className="gap-2">
                    <Upload className="w-4 h-4" />
                    {uploading ? "جاري الرفع..." : "تغيير الشعار"}
                  </Button>
                </div>
              </div>

              <div><Label>الاسم الكامل</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>رقم الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div>
                <Label>المدينة</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                  <SelectContent>
                    {yemeniCities.map((c) => <SelectItem key={c.id} value={c.name_ar}>{c.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleProfileSave} className="gap-2"><Save className="w-4 h-4" /> حفظ</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader><CardTitle className="text-base">تغيير كلمة المرور</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>كلمة المرور الجديدة</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
              <div><Label>تأكيد كلمة المرور</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
              <Button onClick={handlePasswordChange} className="gap-2"><Lock className="w-4 h-4" /> تغيير</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banks">
          <Card>
            <CardHeader><CardTitle className="text-base">الحسابات البنكية</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {bankAccounts.map((bank) => (
                <div key={bank.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{bank.bank_name}</p>
                    <p className="text-sm text-muted-foreground">{bank.account_name} - {bank.account_number}</p>
                    {bank.iban && <p className="text-xs text-muted-foreground">IBAN: {bank.iban}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteBank(bank.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <div className="border-t pt-4 space-y-3">
                <p className="font-medium text-sm">إضافة حساب جديد</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="اسم البنك" value={newBank.bank_name} onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })} />
                  <Input placeholder="اسم صاحب الحساب" value={newBank.account_name} onChange={(e) => setNewBank({ ...newBank, account_name: e.target.value })} />
                  <Input placeholder="رقم الحساب" value={newBank.account_number} onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })} />
                  <Input placeholder="IBAN (اختياري)" value={newBank.iban} onChange={(e) => setNewBank({ ...newBank, iban: e.target.value })} />
                </div>
                <Button onClick={handleAddBank} className="gap-2"><Plus className="w-4 h-4" /> إضافة</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="areas">
          <Card>
            <CardHeader><CardTitle className="text-base">مناطق العمل</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">اختر المناطق التي تقدم خدماتك فيها</p>

              {countryRegions.map((country) => {
                const children = regions.filter(r => r.parent_id === country.id);
                if (children.length === 0) return null;
                return (
                  <div key={country.id}>
                    <h4 className="font-semibold text-sm mb-2 text-primary">{country.name_ar}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {children.map((region) => (
                        <label key={region.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-accent">
                          <Checkbox checked={selectedRegions.includes(region.id)} onCheckedChange={() => toggleRegion(region.id)} />
                          <span>{region.name_ar}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              <Button onClick={handleSaveAreas} className="gap-2"><Save className="w-4 h-4" /> حفظ المناطق</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupplierSettings;
