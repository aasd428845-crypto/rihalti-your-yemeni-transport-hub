import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Award, Link2, Copy, ExternalLink, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRiders, createRider, updateRider, deleteRider, createRiderReward } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import type { Rider } from "@/types/delivery.types";

const DeliveryRiders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Rider | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rewardRider, setRewardRider] = useState("");
  const [rewardForm, setRewardForm] = useState({ amount: 0, description: "", type: "bonus" });
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", vehicle_type: "motorcycle", vehicle_plate: "", id_number: "",
    commission_type: "percentage", commission_value: 10,
  });

  const load = async () => {
    if (!user) return;
    try {
      const data = await getRiders(user.id);
      setRiders(data || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.full_name.trim() || !form.phone.trim()) return;
    try {
      if (editItem) {
        await updateRider(editItem.id, form);
        toast({ title: "تم التحديث" });
        setShowAdd(false); setEditItem(null);
        setForm({ full_name: "", phone: "", email: "", vehicle_type: "motorcycle", vehicle_plate: "", id_number: "", commission_type: "percentage", commission_value: 10 });
        load();
      } else {
        if (!form.email.trim()) {
          toast({ title: "البريد الإلكتروني مطلوب", description: "نحتاج البريد لإنشاء رابط دعوة يربط المندوب بشركتك عند تسجيل الدخول.", variant: "destructive" });
          return;
        }
        // 1. Create the rider placeholder row
        await createRider({ ...form, delivery_company_id: user.id, is_approved: false } as any);

        // 2. Create an invitation token tied to that email so when the
        //    driver signs up via the link, InvitePage links them back to
        //    this rider row (matched on company_id + email).
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const { error: tokErr } = await supabase.from("invitation_tokens").insert({
          email: form.email.trim(),
          role: "delivery_driver",
          token,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        });
        if (tokErr) throw tokErr;

        const link = `${window.location.origin}/invite/${token}`;
        setShowAdd(false); setEditItem(null);
        setForm({ full_name: "", phone: "", email: "", vehicle_type: "motorcycle", vehicle_plate: "", id_number: "", commission_type: "percentage", commission_value: 10 });
        setInviteLink(link);
        setCopied(false);
        try { await navigator.clipboard?.writeText(link); setCopied(true); } catch { /* ignore */ }
        toast({ title: "تمت إضافة المندوب", description: "أرسل رابط الدعوة للمندوب لإكمال تسجيله." });
        load();
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try { await deleteRider(id); toast({ title: "تم الحذف" }); load(); }
    catch (err: any) { toast({ title: "خطأ", description: err.message, variant: "destructive" }); }
  };

  const openEdit = (r: Rider) => {
    setEditItem(r);
    setForm({ full_name: r.full_name, phone: r.phone, email: r.email || "", vehicle_type: r.vehicle_type || "motorcycle", vehicle_plate: r.vehicle_plate || "", id_number: r.id_number || "", commission_type: r.commission_type || "percentage", commission_value: r.commission_value ?? 10 });
    setShowAdd(true);
  };

  const handleReward = async () => {
    if (!user || !rewardRider) return;
    try {
      await createRiderReward({ delivery_company_id: user.id, rider_id: rewardRider, ...rewardForm });
      toast({ title: "تمت إضافة المكافأة" });
      setShowReward(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateInvite = async () => {
    if (!user || generating) return;
    setGenerating(true);
    setCopied(false);
    try {
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const { error } = await supabase.from("invitation_tokens").insert({
        email: `rider-${Date.now()}@invite.local`,
        role: "delivery_driver",
        token,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw error;
      const link = `${window.location.origin}/invite/${token}`;
      setInviteLink(link);
      // Try to copy automatically (best-effort; may fail on non-https/iframe)
      try {
        await navigator.clipboard?.writeText(link);
        setCopied(true);
      } catch { /* ignore – user can copy manually from the dialog */ }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "تم نسخ الرابط ✅" });
    } catch {
      // Fallback: select the text inside the input so user can copy manually
      const el = document.getElementById("invite-link-input") as HTMLInputElement | null;
      el?.select();
      document.execCommand?.("copy");
      setCopied(true);
      toast({ title: "تم نسخ الرابط ✅" });
    }
  };

  const filtered = riders.filter(r => r.full_name.includes(search) || r.phone.includes(search));
  const vehicleLabels: Record<string, string> = { motorcycle: "دراجة نارية", bicycle: "دراجة", car: "سيارة", foot: "مشي" };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold">إدارة المندوبين</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowReward(true)} className="min-h-[44px]"><Award className="w-4 h-4 ml-1" /> مكافأة</Button>
          <Button size="sm" variant="outline" onClick={handleGenerateInvite} disabled={generating} className="min-h-[44px]">
            <Link2 className="w-4 h-4 ml-1" /> {generating ? "جاري الإنشاء..." : "رابط دعوة مندوب"}
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setForm({ full_name: "", phone: "", email: "", vehicle_type: "motorcycle", vehicle_plate: "", id_number: "", commission_type: "percentage", commission_value: 10 }); setShowAdd(true); }} className="min-h-[44px]">
            <Plus className="w-4 h-4 ml-1" /> إضافة مندوب
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا يوجد مندوبين</CardContent></Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">{r.phone}</p>
                    </div>
                    <Badge variant={r.is_online ? "default" : "secondary"}>{r.is_online ? "متصل 🟢" : "غير متصل"}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">المركبة:</span> <span className="font-medium">{vehicleLabels[r.vehicle_type || ""] || r.vehicle_type}</span></div>
                    <div><span className="text-muted-foreground">التوصيلات:</span> <span className="font-medium">{r.total_deliveries}</span></div>
                    <div><span className="text-muted-foreground">التقييم:</span> <span className="font-medium">⭐ {r.rating}</span></div>
                    <div><span className="text-muted-foreground">الأرباح:</span> <span className="font-medium">{Number(r.earnings).toLocaleString()} ر.ي</span></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => openEdit(r)}>
                      <Edit className="w-3 h-3 ml-1" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" className="min-h-[44px] text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm bg-card rounded-lg border">
              <thead><tr className="border-b text-muted-foreground bg-muted/50">
                <th className="text-right p-3">الاسم</th>
                <th className="text-right p-3">الهاتف</th>
                <th className="text-right p-3">المركبة</th>
                <th className="text-right p-3">الحالة</th>
                <th className="text-right p-3">التوصيلات</th>
                <th className="text-right p-3">التقييم</th>
                <th className="text-right p-3">الأرباح</th>
                <th className="text-right p-3">إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.full_name}</td>
                    <td className="p-3">{r.phone}</td>
                    <td className="p-3">{vehicleLabels[r.vehicle_type || ""] || r.vehicle_type}</td>
                    <td className="p-3">
                      <Badge variant={r.is_online ? "default" : "secondary"}>{r.is_online ? "متصل 🟢" : "غير متصل"}</Badge>
                    </td>
                    <td className="p-3">{r.total_deliveries}</td>
                    <td className="p-3">⭐ {r.rating}</td>
                    <td className="p-3">{Number(r.earnings).toLocaleString()} ر.ي</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add/Edit Rider */}
      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) setEditItem(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "تعديل مندوب" : "إضافة مندوب جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم الكامل *</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
            <div><Label>رقم الهاتف *</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>البريد الإلكتروني</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
            <div><Label>نوع المركبة</Label>
              <Select value={form.vehicle_type} onValueChange={v => setForm({...form, vehicle_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle">دراجة نارية</SelectItem>
                  <SelectItem value="bicycle">دراجة</SelectItem>
                  <SelectItem value="car">سيارة</SelectItem>
                  <SelectItem value="foot">مشي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>رقم اللوحة</Label><Input value={form.vehicle_plate} onChange={e => setForm({...form, vehicle_plate: e.target.value})} /></div>
            <div><Label>رقم الهوية</Label><Input value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>نوع العمولة</Label>
                <Select value={form.commission_type} onValueChange={v => setForm({...form, commission_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة %</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>قيمة العمولة</Label><Input type="number" value={form.commission_value} onChange={e => setForm({...form, commission_value: Number(e.target.value)})} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave} className="min-h-[44px]">{editItem ? "تحديث" : "إضافة"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reward Dialog */}
      <Dialog open={showReward} onOpenChange={setShowReward}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة مكافأة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>المندوب</Label>
              <Select value={rewardRider} onValueChange={setRewardRider}>
                <SelectTrigger><SelectValue placeholder="اختر مندوب..." /></SelectTrigger>
                <SelectContent>{riders.map(r => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>المبلغ</Label><Input type="number" value={rewardForm.amount} onChange={e => setRewardForm({...rewardForm, amount: Number(e.target.value)})} /></div>
            <div><Label>الوصف</Label><Input value={rewardForm.description} onChange={e => setRewardForm({...rewardForm, description: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleReward} className="min-h-[44px]">إضافة المكافأة</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite link dialog */}
      <Dialog open={!!inviteLink} onOpenChange={(open) => { if (!open) { setInviteLink(null); setCopied(false); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" /> رابط دعوة المندوب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              أرسل هذا الرابط للمندوب. عند فتحه سيتم نقله إلى صفحة التسجيل وسيُربط بشركتك تلقائياً. الرابط صالح لمدة 7 أيام.
            </p>
            <div className="flex gap-2">
              <Input
                id="invite-link-input"
                value={inviteLink || ""}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="text-xs ltr:text-left rtl:text-left font-mono"
                dir="ltr"
              />
              <Button type="button" variant="outline" size="icon" onClick={copyInviteLink} className="shrink-0" aria-label="نسخ">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                className="flex-1 gap-2"
                onClick={() => inviteLink && window.open(inviteLink, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-4 h-4" />
                فتح الرابط في تبويب جديد
              </Button>
              <Button type="button" variant="outline" className="flex-1 gap-2" onClick={copyInviteLink}>
                {copied ? <><Check className="w-4 h-4 text-green-600" /> تم النسخ</> : <><Copy className="w-4 h-4" /> نسخ الرابط</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryRiders;
