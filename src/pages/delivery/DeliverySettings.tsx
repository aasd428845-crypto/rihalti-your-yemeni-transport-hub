import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DeliverySettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", city: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [bankForm, setBankForm] = useState({ bank_name: "", account_name: "", account_number: "", iban: "" });
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name, phone: profile.phone || "", city: profile.city || "" });
    loadBanks();
  }, [profile]);

  const loadBanks = async () => {
    if (!user) return;
    const { data } = await supabase.from("partner_bank_accounts").select("*").eq("partner_id", user.id);
    setBanks(data || []);
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

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">الإعدادات</h2>

      <Tabs defaultValue="profile">
        <TabsList><TabsTrigger value="profile">الملف الشخصي</TabsTrigger><TabsTrigger value="password">كلمة المرور</TabsTrigger><TabsTrigger value="banks">الحسابات البنكية</TabsTrigger></TabsList>

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
      </Tabs>
    </div>
  );
};

export default DeliverySettings;
