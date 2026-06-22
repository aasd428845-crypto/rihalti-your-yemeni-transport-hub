import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const emptyForm = () => ({
  name: "",
  name_ar: "",
  description: "",
  price_monthly: 0,
  price_yearly: 0,
  max_orders_per_month: "" as string | number,
  max_restaurants: "" as string | number,
  max_riders: "" as string | number,
  commission_override_type: "none",
  commission_override_value: 0,
  features: "",
  is_trial: false,
  trial_days: "" as string | number,
  sort_order: 0,
  is_active: true,
});

type FormState = ReturnType<typeof emptyForm>;

const AdminSubscriptionPlans = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editPlan, setEditPlan] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("subscription_plans")
      .select("*")
      .order("sort_order");
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditPlan(null);
    setForm(emptyForm());
    setShowDialog(true);
  };

  const openEdit = (plan: any) => {
    setEditPlan(plan);
    setForm({
      name: plan.name || "",
      name_ar: plan.name_ar || "",
      description: plan.description || "",
      price_monthly: plan.price_monthly || 0,
      price_yearly: plan.price_yearly || 0,
      max_orders_per_month: plan.max_orders_per_month ?? "",
      max_restaurants: plan.max_restaurants ?? "",
      max_riders: plan.max_riders ?? "",
      commission_override_type: plan.commission_override_type || "none",
      commission_override_value: plan.commission_override_value || 0,
      features: (plan.features || []).join("\n"),
      is_trial: plan.is_trial || false,
      trial_days: plan.trial_days ?? "",
      sort_order: plan.sort_order || 0,
      is_active: plan.is_active ?? true,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name_ar.trim()) {
      toast({ title: "الاسم بالعربي مطلوب", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        name_ar: form.name_ar,
        description: form.description || null,
        price_monthly: Number(form.price_monthly) || 0,
        price_yearly: Number(form.price_yearly) || null,
        max_orders_per_month: form.max_orders_per_month !== "" ? Number(form.max_orders_per_month) : null,
        max_restaurants: form.max_restaurants !== "" ? Number(form.max_restaurants) : null,
        max_riders: form.max_riders !== "" ? Number(form.max_riders) : null,
        commission_override_type: form.commission_override_type === "none" ? null : form.commission_override_type,
        commission_override_value: form.commission_override_type === "none" ? null : Number(form.commission_override_value),
        features: form.features.split("\n").map(s => s.trim()).filter(Boolean),
        is_trial: form.is_trial,
        trial_days: form.is_trial && form.trial_days !== "" ? Number(form.trial_days) : null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editPlan) {
        const { error } = await (supabase as any).from("subscription_plans").update(payload).eq("id", editPlan.id);
        if (error) throw error;
        toast({ title: "✓ تم تحديث الخطة" });
      } else {
        const { error } = await (supabase as any).from("subscription_plans").insert(payload);
        if (error) throw error;
        toast({ title: "✓ تم إضافة الخطة" });
      }
      setShowDialog(false);
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخطة؟ قد يؤثر على الاشتراكات الحالية.")) return;
    setDeleting(id);
    try {
      const { error } = await (supabase as any).from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "✓ تم الحذف" });
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setDeleting(null);
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="w-6 h-6" />خطط الاشتراك</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 ml-1" />إضافة خطة</Button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan: any) => (
          <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{plan.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{plan.name}</p>
                </div>
                <div className="flex gap-1">
                  {plan.is_trial && <Badge variant="outline" className="text-[10px]">تجريبية</Badge>}
                  {!plan.is_active && <Badge variant="secondary" className="text-[10px]">معطّلة</Badge>}
                </div>
              </div>
              <p className="text-xl font-black">{Number(plan.price_monthly).toLocaleString()} <span className="text-xs font-normal">ر.ي/شهر</span></p>
              {plan.commission_override_value && (
                <p className="text-xs text-green-600 font-bold">عمولة: {plan.commission_override_value}%</p>
              )}
              {plan.max_orders_per_month && (
                <p className="text-xs text-muted-foreground">حد الطلبات: {plan.max_orders_per_month}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                  <Pencil className="w-3.5 h-3.5 ml-1" />تعديل
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(plan.id)} disabled={deleting === plan.id}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد خطط بعد. ابدأ بإضافة خطة.</p>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editPlan ? "تعديل الخطة" : "إضافة خطة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم (عربي) *</Label>
                <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
              <div>
                <Label>الاسم (إنجليزي)</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>السعر الشهري (ر.ي)</Label>
                <Input type="number" min={0} value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>السعر السنوي (ر.ي)</Label>
                <Input type="number" min={0} value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>حد الطلبات / شهر (فارغ = لا حد)</Label>
                <Input type="number" min={0} value={form.max_orders_per_month} onChange={e => setForm(f => ({ ...f, max_orders_per_month: e.target.value }))} placeholder="غير محدود" />
              </div>
              <div>
                <Label>الترتيب</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع تخفيض العمولة</Label>
                <Select value={form.commission_override_type} onValueChange={v => setForm(f => ({ ...f, commission_override_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تخفيض</SelectItem>
                    <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.commission_override_type !== "none" && (
                <div>
                  <Label>قيمة تخفيض العمولة</Label>
                  <Input type="number" min={0} value={form.commission_override_value} onChange={e => setForm(f => ({ ...f, commission_override_value: Number(e.target.value) }))} />
                </div>
              )}
            </div>
            <div>
              <Label>الميزات (كل سطر ميزة)</Label>
              <Textarea rows={4} value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="ميزة أولى&#10;ميزة ثانية&#10;ميزة ثالثة" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_trial} onCheckedChange={v => setForm(f => ({ ...f, is_trial: v }))} />
                <Label>تجريبية</Label>
              </div>
              {form.is_trial && (
                <div className="flex items-center gap-2">
                  <Label>أيام التجربة</Label>
                  <Input type="number" min={1} className="w-20" value={form.trial_days} onChange={e => setForm(f => ({ ...f, trial_days: e.target.value }))} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <Label>نشطة</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionPlans;
