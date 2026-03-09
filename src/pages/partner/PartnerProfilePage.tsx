import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getRegions, getSupplierWorkingAreas, updateWorkingAreas, getSupplierBankAccounts, addBankAccount, deleteBankAccount } from "@/lib/supplierApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, User, Trash2, Plus, Building, MapPinned, FileText, CheckCircle2 } from "lucide-react";
import RegionSelector from "@/components/regions/RegionSelector";
import type { Region } from "@/types/supplier.types";

const PartnerProfilePage = () => {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Regions
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<number[]>([]);

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({ bank_name: "", account_name: "", account_number: "", iban: "" });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadAll();
  }, [user?.id]);

  const loadAll = async () => {
    const [profileRes, regionsRes, areasRes, banksRes] = await Promise.all([
      supabase.from("profiles").select("full_name, phone, phone_secondary, logo_url, description, profile_completed").eq("user_id", user!.id).maybeSingle(),
      getRegions(),
      getSupplierWorkingAreas(user!.id),
      getSupplierBankAccounts(user!.id),
    ]);

    if (profileRes.data) {
      setFullName(profileRes.data.full_name || "");
      setPhone(profileRes.data.phone || "");
      setPhoneSecondary(profileRes.data.phone_secondary || "");
      setLogoUrl(profileRes.data.logo_url || "");
      setDescription(profileRes.data.description || "");
    }
    setEmail(user?.email || "");
    setRegions(regionsRes.data || []);
    setSelectedRegions((areasRes.data || []).map((a: any) => a.region_id));
    setBankAccounts(banksRes.data || []);
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `partner-${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("profile-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("profile-logos").getPublicUrl(path);
      await supabase.from("profiles").update({ logo_url: urlData.publicUrl }).eq("user_id", user.id);
      setLogoUrl(urlData.publicUrl);
      toast({ title: "✅ تم رفع الصورة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: "الاسم مطلوب", variant: "destructive" });
      return;
    }
    if (!phone.trim()) {
      toast({ title: "رقم الهاتف مطلوب", variant: "destructive" });
      return;
    }
    if (selectedRegions.length === 0) {
      toast({ title: "يجب اختيار منطقة عمل واحدة على الأقل", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error: profileError } = await supabase.from("profiles").update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        phone_secondary: phoneSecondary || null,
        description: description || null,
        profile_completed: true,
      }).eq("user_id", user!.id);

      if (profileError) throw profileError;

      await updateWorkingAreas(user!.id, selectedRegions);

      toast({ title: "✅ تم حفظ الملف الشخصي بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleAddBank = async () => {
    if (!newBank.bank_name || !newBank.account_number) return;
    const { error } = await addBankAccount({ ...newBank, partner_id: user!.id });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "✅ تمت إضافة الحساب البنكي" });
      setNewBank({ bank_name: "", account_name: "", account_number: "", iban: "" });
      loadAll();
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الحساب؟")) return;
    await deleteBankAccount(id);
    toast({ title: "تم حذف الحساب" });
    loadAll();
  };

  const roleLabel = role === "supplier" ? "صاحب مكتب" : role === "delivery_company" ? "شركة توصيل" : "سائق";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">الملف الشخصي</h2>
          <p className="text-sm text-muted-foreground">أكمل بياناتك كـ{roleLabel}</p>
        </div>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> البيانات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div>
            <Label>الصورة / الشعار</Label>
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
                {uploading ? "جاري الرفع..." : "تغيير الصورة"}
              </Button>
            </div>
          </div>

          <div>
            <Label>الاسم الكامل / اسم الشركة <span className="text-destructive">*</span></Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>رقم الهاتف <span className="text-destructive">*</span></Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" dir="ltr" />
          </div>

          <div>
            <Label>رقم هاتف ثانوي</Label>
            <Input value={phoneSecondary} onChange={(e) => setPhoneSecondary(e.target.value)} className="mt-1" dir="ltr" />
          </div>

          <div>
            <Label>البريد الإلكتروني</Label>
            <Input value={email} disabled className="mt-1 bg-muted" dir="ltr" />
          </div>

          <div>
            <Label>وصف مختصر</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="اكتب وصفاً مختصراً عن نشاطك أو خدماتك..." className="mt-1" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Working Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPinned className="w-4 h-4 text-primary" /> مناطق العمل <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RegionSelector
            regions={regions}
            mode="multi"
            selectedIds={selectedRegions}
            onSelectedIdsChange={setSelectedRegions}
            allowCustom={true}
            required={true}
          />
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" /> الحسابات البنكية <span className="text-xs text-muted-foreground">(اختياري)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bankAccounts.map((bank) => (
            <div key={bank.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{bank.bank_name}</p>
                <p className="text-sm text-muted-foreground">{bank.account_name} - {bank.account_number}</p>
                {bank.iban && <p className="text-xs text-muted-foreground">IBAN: {bank.iban}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteBank(bank.id)} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
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
            <Button onClick={handleAddBank} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> إضافة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full gap-2">
        {saving ? (
          <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
        ) : (
          <CheckCircle2 className="w-5 h-5" />
        )}
        {saving ? "جاري الحفظ..." : "حفظ الملف الشخصي"}
      </Button>
    </div>
  );
};

export default PartnerProfilePage;
