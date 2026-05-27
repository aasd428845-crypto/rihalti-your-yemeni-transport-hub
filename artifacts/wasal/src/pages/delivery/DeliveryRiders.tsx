import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Search, Edit, Trash2, Award, Link2, Copy, ExternalLink, Check,
  BarChart2, Calendar, Package, DollarSign, Truck, Clock, TrendingUp, User, Phone, Bike
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRiders, updateRider, deleteRider, createRiderReward, getRiderStats, settleRiderCash } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS_MAP } from "@/types/delivery.types";
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
  const [copied, setCopied] = useState(false);
  const [rewardRider, setRewardRider] = useState("");
  const [rewardForm, setRewardForm] = useState({ amount: 0, description: "", type: "bonus" });
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", vehicle_type: "motorcycle", vehicle_plate: "", id_number: "",
    commission_type: "percentage", commission_value: 10,
  });
  const [newRiderEmail, setNewRiderEmail] = useState("");

  // ── Rider Stats ──
  const [statsRider, setStatsRider] = useState<Rider | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [settlingCash, setSettlingCash] = useState<string | null>(null);

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

  const openStats = async (rider: Rider) => {
    setStatsRider(rider);
    setStatsLoading(true);
    setStats(null);
    try {
      const data = await getRiderStats(rider.id);
      setStats(data);
    } catch (err: any) {
      toast({ title: "خطأ في جلب الإحصائيات", description: err.message, variant: "destructive" });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSettleCash = async (collectionId: string) => {
    if (!user || !statsRider) return;
    setSettlingCash(collectionId);
    try {
      await settleRiderCash(collectionId, user.id);
      // Notify the rider that their cash has been received
      await supabase.from("notifications").insert({
        user_id: (statsRider as any).user_id,
        type: "cash_settled",
        title: "✅ تم تسليم المبلغ",
        message: "تم استلام مبلغ التحصيل من قِبل الإدارة — ذمّتك بريئة.",
        data: { collection_id: collectionId, settled_by: user.id },
        is_read: false,
      } as any);
      toast({ title: "✅ تم التسجيل", description: "تم تسجيل استلام المبلغ وإشعار المندوب." });
      // Refresh stats
      const fresh = await getRiderStats(statsRider.id);
      setStats(fresh);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSettlingCash(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      if (editItem) {
        await updateRider(editItem.id, form);
        toast({ title: "تم التحديث" });
        setShowAdd(false); setEditItem(null);
        setForm({ full_name: "", phone: "", email: "", vehicle_type: "motorcycle", vehicle_plate: "", id_number: "", commission_type: "percentage", commission_value: 10 });
        load();
      } else {
        const email = newRiderEmail.trim();
        if (!email || !email.includes("@")) {
          toast({ title: "البريد الإلكتروني غير صالح", description: "أدخل بريد إلكتروني صحيح للمندوب.", variant: "destructive" });
          return;
        }
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const { error: tokErr } = await supabase.from("invitation_tokens").insert({
          email,
          role: "delivery_driver",
          token,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
        });
        if (tokErr) throw tokErr;

        // Pre-create a rider row (placeholder) so it's ready when the driver registers
        try {
          await supabase.from("riders").insert({
            delivery_company_id: user.id,
            email,
            full_name: email.split("@")[0],
            phone: "",
            is_active: false,
            is_approved: false,
          } as any);
        } catch (_) {}

        const link = `${window.location.origin}/invite/${token}`;
        setShowAdd(false);
        setNewRiderEmail("");
        setInviteLink(link);
        setCopied(false);
        try { await navigator.clipboard?.writeText(link); setCopied(true); } catch { /* ignore */ }
        toast({ title: "تم إنشاء رابط الدعوة", description: "أرسل الرابط للمندوب لإكمال تسجيله." });
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

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "تم نسخ الرابط ✅" });
    } catch {
      const el = document.getElementById("invite-link-input") as HTMLInputElement | null;
      el?.select();
      document.execCommand?.("copy");
      setCopied(true);
      toast({ title: "تم نسخ الرابط ✅" });
    }
  };

  const vehicleLabels: Record<string, string> = { motorcycle: "دراجة نارية", bicycle: "دراجة", car: "سيارة", foot: "مشي" };
  const filtered = riders.filter(r => r.full_name.includes(search) || r.phone.includes(search));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-bold">إدارة المندوبين</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowReward(true)} className="min-h-[44px]"><Award className="w-4 h-4 ml-1" /> مكافأة</Button>
          <Button size="sm" onClick={() => { setEditItem(null); setNewRiderEmail(""); setShowAdd(true); }} className="min-h-[44px]">
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
                      {r.created_at && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          انضم: {new Date(r.created_at).toLocaleDateString("ar")}
                        </p>
                      )}
                    </div>
                    {!(r as any).user_id ? (
                      <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">⏳ ينتظر التسجيل</Badge>
                    ) : (
                      <Badge variant={r.is_online ? "default" : "secondary"}>{r.is_online ? "متصل 🟢" : "غير متصل"}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">المركبة:</span> <span className="font-medium">{vehicleLabels[r.vehicle_type || ""] || r.vehicle_type || "—"}</span></div>
                    <div><span className="text-muted-foreground">التوصيلات:</span> <span className="font-bold text-primary">{r.total_deliveries}</span></div>
                    <div><span className="text-muted-foreground">التقييم:</span> <span className="font-medium">⭐ {r.rating}</span></div>
                    <div><span className="text-muted-foreground">الأرباح:</span> <span className="font-medium">{Number(r.earnings).toLocaleString()} ر.ي</span></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="default" className="flex-1 min-h-[44px] bg-primary/10 text-primary hover:bg-primary/20 border-0" onClick={() => openStats(r)}>
                      <BarChart2 className="w-3.5 h-3.5 ml-1" /> إحصائيات
                    </Button>
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
                <th className="text-right p-3">تاريخ الانضمام</th>
                <th className="text-right p-3">إجراءات</th>
              </tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.full_name}</td>
                    <td className="p-3">{r.phone}</td>
                    <td className="p-3">{vehicleLabels[r.vehicle_type || ""] || r.vehicle_type || "—"}</td>
                    <td className="p-3">
                      {!(r as any).user_id ? (
                        <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">⏳ ينتظر التسجيل</Badge>
                      ) : (
                        <Badge variant={r.is_online ? "default" : "secondary"}>{r.is_online ? "متصل 🟢" : "غير متصل"}</Badge>
                      )}
                    </td>
                    <td className="p-3 font-bold text-primary">{r.total_deliveries}</td>
                    <td className="p-3">⭐ {r.rating}</td>
                    <td className="p-3">{Number(r.earnings).toLocaleString()} ر.ي</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("ar") : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary/5" onClick={() => openStats(r)} title="إحصائيات المندوب">
                          <BarChart2 className="w-3 h-3" />
                        </Button>
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

      {/* ── Add/Edit Rider Dialog ── */}
      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) setEditItem(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "تعديل مندوب" : "إضافة مندوب جديد"}</DialogTitle></DialogHeader>

          {editItem ? (
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
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                أدخل البريد الإلكتروني للمندوب. سيُنشأ رابط دعوة يُرسَل له لإكمال تسجيله وربطه بشركتك تلقائياً.
              </p>
              <div>
                <Label>البريد الإلكتروني للمندوب <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  dir="ltr"
                  className="mt-1 h-11"
                  placeholder="example@email.com"
                  value={newRiderEmail}
                  onChange={e => setNewRiderEmail(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          <DialogFooter><Button onClick={handleSave} className="min-h-[44px]">{editItem ? "تحديث" : "إنشاء رابط الدعوة"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reward Dialog ── */}
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

      {/* ── Invite Link Dialog ── */}
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
                className="text-xs font-mono"
                dir="ltr"
              />
              <Button type="button" variant="outline" size="icon" onClick={copyInviteLink} className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" className="flex-1 gap-2" onClick={() => inviteLink && window.open(inviteLink, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="w-4 h-4" /> فتح الرابط
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => inviteLink && window.open(`https://wa.me/?text=${encodeURIComponent("رابط إنشاء حساب مندوب توصيل:\n" + inviteLink)}`, "_blank")}
              >
                إرسال واتساب
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Rider Stats Dialog ── */}
      <Dialog open={!!statsRider} onOpenChange={open => { if (!open) { setStatsRider(null); setStats(null); } }}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              إحصائيات المندوب — {statsRider?.full_name}
            </DialogTitle>
            {statsRider && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                {statsRider.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{statsRider.phone}</span>
                )}
                {statsRider.vehicle_type && (
                  <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5" />{vehicleLabels[statsRider.vehicle_type] || statsRider.vehicle_type}</span>
                )}
                {statsRider.vehicle_plate && (
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" />{statsRider.vehicle_plate}</span>
                )}
                {statsRider.created_at && (
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />انضم: {new Date(statsRider.created_at).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" })}</span>
                )}
                <Badge variant={statsRider.is_online ? "default" : "secondary"} className="text-xs">
                  {statsRider.is_online ? "متصل 🟢" : "غير متصل"}
                </Badge>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {statsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-sm text-muted-foreground">جاري جلب الإحصائيات...</p>
              </div>
            ) : stats ? (
              <>
                {/* ── إحصائيات اليوم ── */}
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> إحصائيات اليوم
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-primary">{stats.todayOrders}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">طلب اليوم</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-emerald-600">{stats.todayDelivered}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">مُوصَّل اليوم</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-amber-600">{stats.todayCashValue.toLocaleString()}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">نقد اليوم (ر.ي)</p>
                    </div>
                  </div>
                </div>

                {/* ── الإحصائيات الكلية ── */}
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> الإجمالي الكلي
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-card border rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">إجمالي الطلبات</span>
                      </div>
                      <p className="text-xl font-black">{stats.totalOrders}</p>
                      <p className="text-[10px] text-muted-foreground">منها {stats.deliveredOrders} مُوصَّل</p>
                    </div>
                    <div className="bg-card border rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-muted-foreground">إجمالي النقد المحصَّل</span>
                      </div>
                      <p className="text-xl font-black text-amber-600">{stats.totalCashValue.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">ر.ي</p>
                    </div>
                  </div>
                </div>

                {/* ── سجل التحصيلات النقدية (مع زر تم الاستلام) ── */}
                {stats.cashCollections?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" /> سجل التحصيلات النقدية ({stats.cashCollections.length})
                    </h3>
                    {/* Summary row */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {stats.pendingCash > 0 && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-1">💵 مستحق التسليم</p>
                          <p className="text-lg font-black text-red-600">{stats.pendingCash.toLocaleString()} ر.ي</p>
                        </div>
                      )}
                      {stats.settledCash > 0 && (
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl p-3">
                          <p className="text-xs text-muted-foreground mb-1">✅ تم التسوية</p>
                          <p className="text-lg font-black text-green-600">{stats.settledCash.toLocaleString()} ر.ي</p>
                        </div>
                      )}
                    </div>
                    {/* Individual collection entries */}
                    <div className="space-y-2">
                      {stats.cashCollections.map((col: any) => {
                        const isPending = ["pending_pickup", "collected"].includes(col.status);
                        const isSettled = col.status === "settled";
                        const orderId = (col.order?.id || col.order_id || "").slice(0, 8);
                        return (
                          <div
                            key={col.id}
                            className={`border rounded-lg px-3 py-2.5 text-sm bg-card ${isPending ? "border-amber-300 dark:border-amber-800" : "border-border"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <p className="font-semibold text-foreground">
                                  {Number(col.amount).toLocaleString()} ر.ي
                                  {isSettled && <span className="text-[10px] text-green-600 mr-2">✅ تم التسليم</span>}
                                  {isPending && <span className="text-[10px] text-amber-600 mr-2">⏳ مستحق</span>}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {col.order?.customer_name || "—"}
                                  {orderId && <span className="font-mono mr-2 text-primary">#{orderId}</span>}
                                </p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {new Date(col.collected_at || col.created_at).toLocaleString("ar", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  {isSettled && col.settled_at && (
                                    <span className="mr-2">
                                      · سُوِّي: {new Date(col.settled_at).toLocaleString("ar", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {isPending && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0 text-xs border-green-500 text-green-600 hover:bg-green-50 h-8 px-2"
                                  disabled={settlingCash === col.id}
                                  onClick={() => handleSettleCash(col.id)}
                                >
                                  {settlingCash === col.id ? (
                                    <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                  ) : "تم الاستلام ✓"}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── سجل الطلبات الأخيرة ── */}
                {stats.recentOrders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4" /> سجل الطلبات ({stats.recentOrders.length})
                    </h3>
                    <div className="space-y-1.5">
                      {stats.recentOrders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-card hover:bg-muted/30 transition">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{order.customer_name || "—"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-primary">#{order.id.slice(0, 8)}</span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(order.created_at).toLocaleDateString("ar", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 mr-2">
                            {order.payment_method === "cash" && (
                              <span className="text-[9px] bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">نقد</span>
                            )}
                            <span className="text-sm font-bold">{Number(order.total).toLocaleString()} ر.ي</span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${ORDER_STATUS_MAP[order.status]?.color || ""}`}
                            >
                              {ORDER_STATUS_MAP[order.status]?.label || order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.recentOrders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    لا توجد طلبات بعد لهذا المندوب
                  </div>
                )}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryRiders;
