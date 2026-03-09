import { useState, useEffect } from "react";
import { User, Lock, Save, Phone } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import Header from "@/components/landing/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/lib/customerApi";
import { supabase } from "@/integrations/supabase/client";
import { getPhoneError, formatYemeniPhone } from "@/lib/phoneValidation";
import LoyaltyPointsCard from "@/components/loyalty/LoyaltyPointsCard";

const AccountPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [form, setForm] = useState({ full_name: "", phone: "", phone_secondary: "", city: "" });
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        phone_secondary: (profile as any).phone_secondary || "",
        city: profile.city || "",
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const phoneErr = form.phone ? getPhoneError(form.phone) : null;
    const phone2Err = form.phone_secondary ? getPhoneError(form.phone_secondary) : null;
    if (phoneErr) { toast({ title: "رقم الهاتف الأساسي: " + phoneErr, variant: "destructive" }); return; }
    if (phone2Err) { toast({ title: "رقم الهاتف الثانوي: " + phone2Err, variant: "destructive" }); return; }
    
    setSaving(true);
    try {
      await updateProfile(user.id, form);
      toast({ title: "✅ تم تحديث الملف الشخصي بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "كلمات المرور غير متطابقة", variant: "destructive" });
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast({ title: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
      if (error) throw error;
      toast({ title: "تم تغيير كلمة المرور بنجاح" });
      setPasswords({ newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">يرجى تسجيل الدخول</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <BackButton />
        <h1 className="text-3xl font-bold text-foreground mb-8">حسابي</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input value={user.email || ""} disabled />
            </div>
            <div>
              <Label>الاسم الكامل</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Phone className="w-3 h-3 text-primary" /> رقم الهاتف الأساسي</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex items-center justify-center bg-muted rounded-md px-3 h-10 text-sm font-medium text-muted-foreground border border-input shrink-0" dir="ltr">+967</div>
                <Input 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: formatYemeniPhone(e.target.value) })} 
                  placeholder="7XX XXX XXX" 
                  dir="ltr" 
                  maxLength={9}
                />
              </div>
              {form.phone && getPhoneError(form.phone) && <p className="text-xs text-destructive mt-1">{getPhoneError(form.phone)}</p>}
            </div>
            <div>
              <Label className="flex items-center gap-1"><Phone className="w-3 h-3 text-secondary" /> رقم الهاتف الثانوي (اختياري)</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex items-center justify-center bg-muted rounded-md px-3 h-10 text-sm font-medium text-muted-foreground border border-input shrink-0" dir="ltr">+967</div>
                <Input 
                  value={form.phone_secondary} 
                  onChange={(e) => setForm({ ...form, phone_secondary: formatYemeniPhone(e.target.value) })} 
                  placeholder="7XX XXX XXX" 
                  dir="ltr" 
                  maxLength={9}
                />
              </div>
              {form.phone_secondary && getPhoneError(form.phone_secondary) && <p className="text-xs text-destructive mt-1">{getPhoneError(form.phone_secondary)}</p>}
            </div>
            <div>
              <Label>المدينة</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              تغيير كلمة المرور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>كلمة المرور الجديدة</Label>
              <Input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
            </div>
            <div>
              <Label>تأكيد كلمة المرور</Label>
              <Input type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" className="gap-2">
              <Lock className="w-4 h-4" />
              {changingPassword ? "جاري التغيير..." : "تغيير كلمة المرور"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountPage;
