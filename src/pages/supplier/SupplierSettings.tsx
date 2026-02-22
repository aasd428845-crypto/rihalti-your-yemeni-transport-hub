import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, getSupplierBankAccounts, addBankAccount, deleteBankAccount, getSupplierWorkingAreas, updateWorkingAreas, getRegions } from "@/lib/supplierApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Lock } from "lucide-react";
import type { Region } from "@/types/supplier.types";

const SupplierSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Profile
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({ bank_name: "", account_name: "", account_number: "", iban: "" });

  // Working areas
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    const [banksRes, areasRes, regionsRes] = await Promise.all([
      getSupplierBankAccounts(user!.id),
      getSupplierWorkingAreas(user!.id),
      getRegions(),
    ]);
    setBankAccounts(banksRes.data || []);
    setSelectedRegions((areasRes.data || []).map((a: any) => a.region_id));
    setRegions(regionsRes.data || []);
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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الإعدادات</h2>

      <Tabs defaultValue="profile" dir="rtl">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
          <TabsTrigger value="password">كلمة المرور</TabsTrigger>
          <TabsTrigger value="banks">الحسابات البنكية</TabsTrigger>
          <TabsTrigger value="areas">مناطق العمل</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">الملف الشخصي</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>الاسم الكامل</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label>رقم الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>المدينة</Label><Input value={city} onChange={(e) => setCity(e.target.value)} /></div>
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
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">اختر المناطق التي تقدم خدماتك فيها</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {regions.map((region) => (
                  <label key={region.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selectedRegions.includes(region.id)} onCheckedChange={() => toggleRegion(region.id)} />
                    <span>{region.name_ar}</span>
                    <span className="text-xs text-muted-foreground">({region.type === "governorate" ? "محافظة" : "دولة"})</span>
                  </label>
                ))}
              </div>
              <Button onClick={handleSaveAreas} className="gap-2"><Save className="w-4 h-4" /> حفظ المناطق</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupplierSettings;
