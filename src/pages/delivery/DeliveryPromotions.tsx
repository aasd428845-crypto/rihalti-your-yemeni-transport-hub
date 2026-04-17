import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Tag, Truck, Clock, Calendar, Gift, Percent, BadgeDollarSign, AlarmClock, ChevronDown, ChevronUp } from "lucide-react";
import { getActiveRestaurants } from "@/lib/restaurantApi";
import {
  getRestaurantPromotions, createRestaurantPromotion, updateRestaurantPromotion,
  deleteRestaurantPromotion, type RestaurantPromotion, type PromoType
} from "@/lib/promotionsApi";
import { useToast } from "@/hooks/use-toast";

const PROMO_TYPES: { value: PromoType; label: string; icon: any; group: string; desc: string }[] = [
  // Delivery
  { value: "free_delivery_min_order", label: "توصيل مجاني عند حد أدنى للطلب", icon: Truck, group: "delivery", desc: "مثال: توصيل مجاني عند الطلب فوق 2000 ر.ي" },
  { value: "free_delivery_schedule", label: "توصيل مجاني في أيام/أوقات محددة", icon: Calendar, group: "delivery", desc: "مثال: توصيل مجاني كل جمعة وسبت" },
  { value: "free_delivery_limited", label: "توصيل مجاني لفترة محدودة", icon: AlarmClock, group: "delivery", desc: "مثال: عرض التوصيل المجاني لمدة أسبوع" },
  // Discounts
  { value: "discount_percent", label: "خصم نسبي على الطلب", icon: Percent, group: "discount", desc: "مثال: خصم 15% على جميع الطلبات" },
  { value: "fixed_discount", label: "خصم بمبلغ ثابت", icon: BadgeDollarSign, group: "discount", desc: "مثال: خصم 500 ر.ي على كل طلب" },
  // Combos
  { value: "buy_x_get_y", label: "اطلب X وادفع Y (كومبو)", icon: Gift, group: "combo", desc: "مثال: اطلب 3 وادفع ثمن 2" },
  // Custom
  { value: "custom_text", label: "عرض مخصص بنص حر", icon: Tag, group: "custom", desc: "أي عرض تريد كتابته بنص مخصص" },
];

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const GROUP_LABELS: Record<string, string> = {
  delivery: "🚚 عروض التوصيل",
  discount: "🏷️ عروض الخصومات",
  combo: "🎁 عروض الكومبو",
  custom: "✏️ عروض مخصصة",
};

const emptyForm = (): any => ({
  promo_type: "free_delivery_min_order" as PromoType,
  title: "",
  description: "",
  promo_text: "",
  min_order_amount: 0,
  discount_percent: 0,
  discount_amount: 0,
  buy_quantity: 2,
  get_quantity: 1,
  active_days: [] as string[],
  start_time: "",
  end_time: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  sort_order: 0,
  restaurant_id: "",
});

const promoTypeInfo = (t: PromoType) => PROMO_TYPES.find(p => p.value === t) || PROMO_TYPES[0];

const PromoTypeBadge = ({ type }: { type: PromoType }) => {
  const info = promoTypeInfo(type);
  const colorMap: Record<string, string> = {
    delivery: "bg-blue-500",
    discount: "bg-red-500",
    combo: "bg-purple-500",
    custom: "bg-teal-500",
  };
  return (
    <Badge className={`${colorMap[info.group]} text-white border-0 text-[10px] gap-1 px-2 py-0.5`}>
      <info.icon className="w-2.5 h-2.5" />{info.label}
    </Badge>
  );
};

const DeliveryPromotions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [promotions, setPromotions] = useState<RestaurantPromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<RestaurantPromotion | null>(null);
  const [form, setForm] = useState<any>(emptyForm());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    getActiveRestaurants().then(data => {
      setRestaurants(data || []);
      if (data?.length) setSelectedRestaurant(data[0].id);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedRestaurant) return;
    setLoading(true);
    getRestaurantPromotions(selectedRestaurant)
      .then(data => setPromotions(data))
      .catch(err => toast({ title: "خطأ في التحميل", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [selectedRestaurant]);

  const openNew = () => {
    setEditItem(null);
    setForm({ ...emptyForm(), restaurant_id: selectedRestaurant });
    setShowDialog(true);
  };

  const openEdit = (p: RestaurantPromotion) => {
    setEditItem(p);
    setForm({
      ...emptyForm(),
      ...p,
      active_days: p.active_days || [],
      starts_at: p.starts_at ? p.starts_at.slice(0, 16) : "",
      ends_at: p.ends_at ? p.ends_at.slice(0, 16) : "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "أدخل عنوان العرض", variant: "destructive" }); return; }
    if (!form.restaurant_id) { toast({ title: "اختر المطعم", variant: "destructive" }); return; }
    try {
      const payload: any = {
        restaurant_id: form.restaurant_id,
        promo_type: form.promo_type,
        title: form.title,
        description: form.description || null,
        promo_text: form.promo_text || null,
        is_active: form.is_active,
        sort_order: form.sort_order || 0,
        min_order_amount: form.min_order_amount || null,
        discount_percent: form.discount_percent || null,
        discount_amount: form.discount_amount || null,
        buy_quantity: form.buy_quantity || null,
        get_quantity: form.get_quantity || null,
        active_days: form.active_days?.length ? form.active_days : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };
      if (editItem) {
        await updateRestaurantPromotion(editItem.id, payload);
        toast({ title: "تم تحديث العرض ✓" });
      } else {
        await createRestaurantPromotion(payload);
        toast({ title: "تمت إضافة العرض ✓" });
      }
      setShowDialog(false);
      getRestaurantPromotions(selectedRestaurant).then(setPromotions).catch(() => {});
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا العرض؟")) return;
    try {
      await deleteRestaurantPromotion(id);
      toast({ title: "تم حذف العرض" });
      setPromotions(p => p.filter(x => x.id !== id));
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (p: RestaurantPromotion) => {
    try {
      await updateRestaurantPromotion(p.id, { is_active: !p.is_active });
      setPromotions(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    } catch {}
  };

  const toggleDay = (day: string) => {
    const days = form.active_days || [];
    setForm({ ...form, active_days: days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day] });
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const promoSummary = (p: RestaurantPromotion): string => {
    switch (p.promo_type) {
      case "free_delivery_min_order": return `توصيل مجاني عند الطلب فوق ${p.min_order_amount || 0} ر.ي`;
      case "free_delivery_schedule": return `توصيل مجاني في: ${p.active_days?.join("، ") || "—"}${p.start_time ? ` من ${p.start_time}` : ""}${p.end_time ? ` حتى ${p.end_time}` : ""}`;
      case "free_delivery_limited": return `توصيل مجاني${p.ends_at ? ` حتى ${new Date(p.ends_at).toLocaleDateString("ar")}` : ""}`;
      case "discount_percent": return `خصم ${p.discount_percent || 0}% على الطلب`;
      case "fixed_discount": return `خصم ${p.discount_amount || 0} ر.ي على الطلب`;
      case "buy_x_get_y": return `اطلب ${p.buy_quantity || 0} وادفع ثمن ${p.get_quantity || 0}`;
      case "custom_text": return p.promo_text || p.description || "";
      default: return "";
    }
  };

  const selectedRestaurantName = restaurants.find(r => r.id === selectedRestaurant)?.name_ar || "";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">العروض والخصومات</h2>
          <p className="text-sm text-muted-foreground">عروض التوصيل والوجبات والخصومات لزبائنك</p>
        </div>
        <Button onClick={openNew} disabled={!selectedRestaurant}>
          <Plus className="w-4 h-4 ml-1" /> إضافة عرض جديد
        </Button>
      </div>

      {/* Restaurant Selector */}
      {restaurants.length > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="font-semibold shrink-0">المطعم:</Label>
          <div className="flex gap-2 flex-wrap">
            {restaurants.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRestaurant(r.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${selectedRestaurant === r.id ? "bg-primary text-white border-primary" : "bg-muted border-border hover:border-primary/50"}`}
              >
                {r.name_ar}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Types explanation */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(GROUP_LABELS).map(([group, label]) => {
          const types = PROMO_TYPES.filter(t => t.group === group);
          const Icon = types[0].icon;
          return (
            <div key={group} className="rounded-xl border bg-card p-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10"><Icon className="w-4 h-4 text-primary" /></div>
                <span className="font-bold text-sm">{label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{types.map(t => t.label).join(" | ")}</p>
            </div>
          );
        })}
      </div>

      {/* Promotions List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold text-lg mb-1">لا توجد عروض بعد</p>
            <p className="text-muted-foreground text-sm mb-4">أضف عروض لزبائنك لزيادة الطلبات</p>
            <Button onClick={openNew} disabled={!selectedRestaurant}><Plus className="w-4 h-4 ml-1" /> إضافة عرض</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map(p => {
            const expanded = expandedCards.has(p.id);
            const info = promoTypeInfo(p.promo_type);
            return (
              <Card key={p.id} className={`transition-all ${!p.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                      <info.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-base">{p.title}</h3>
                        <PromoTypeBadge type={p.promo_type} />
                        {!p.is_active && <Badge variant="secondary">مخفي</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{promoSummary(p)}</p>
                      {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleExpand(p.id)}>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1 grid grid-cols-2 gap-x-4">
                      {p.min_order_amount && <span>الحد الأدنى للطلب: {p.min_order_amount} ر.ي</span>}
                      {p.discount_percent && <span>نسبة الخصم: {p.discount_percent}%</span>}
                      {p.discount_amount && <span>مبلغ الخصم: {p.discount_amount} ر.ي</span>}
                      {p.buy_quantity && <span>اطلب: {p.buy_quantity} صنف</span>}
                      {p.get_quantity && <span>وادفع: {p.get_quantity} صنف</span>}
                      {p.active_days?.length && <span className="col-span-2">الأيام: {p.active_days.join("، ")}</span>}
                      {p.start_time && <span>من: {p.start_time}</span>}
                      {p.end_time && <span>حتى: {p.end_time}</span>}
                      {p.starts_at && <span>يبدأ: {new Date(p.starts_at).toLocaleDateString("ar")}</span>}
                      {p.ends_at && <span>ينتهي: {new Date(p.ends_at).toLocaleDateString("ar")}</span>}
                      {p.promo_text && <span className="col-span-2">نص العرض: {p.promo_text}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل العرض" : "إضافة عرض جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Restaurant selector in form */}
            {restaurants.length > 1 && (
              <div>
                <Label className="font-semibold">المطعم <span className="text-destructive">*</span></Label>
                <Select value={form.restaurant_id} onValueChange={v => setForm({...form, restaurant_id: v})}>
                  <SelectTrigger><SelectValue placeholder="اختر المطعم" /></SelectTrigger>
                  <SelectContent>
                    {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Promo type selector */}
            <div>
              <Label className="font-semibold">نوع العرض <span className="text-destructive">*</span></Label>
              {Object.entries(GROUP_LABELS).map(([group, groupLabel]) => {
                const groupTypes = PROMO_TYPES.filter(t => t.group === group);
                return (
                  <div key={group} className="mt-3">
                    <p className="text-xs font-bold text-muted-foreground mb-2">{groupLabel}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {groupTypes.map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm({...form, promo_type: t.value})}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-right text-sm transition-all ${form.promo_type === t.value ? "bg-primary/10 border-primary text-primary font-semibold" : "bg-muted/50 border-border hover:border-primary/40"}`}
                        >
                          <t.icon className="w-4 h-4 shrink-0" />
                          <div>
                            <p className="font-semibold leading-tight">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Common: title + description */}
            <div className="grid gap-3">
              <div>
                <Label className="font-semibold">عنوان العرض <span className="text-destructive">*</span></Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="مثال: توصيل مجاني نهاية الأسبوع" />
              </div>
              <div>
                <Label>وصف العرض (اختياري)</Label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="تفاصيل إضافية..." rows={2} />
              </div>
            </div>

            {/* free_delivery_min_order */}
            {form.promo_type === "free_delivery_min_order" && (
              <div>
                <Label className="font-semibold">الحد الأدنى للطلب (ر.ي)</Label>
                <Input type="number" min={0} value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: Number(e.target.value)})} placeholder="2000" />
              </div>
            )}

            {/* free_delivery_schedule */}
            {form.promo_type === "free_delivery_schedule" && (
              <div className="space-y-3">
                <div>
                  <Label className="font-semibold">الأيام المفعّلة</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${(form.active_days || []).includes(d) ? "bg-primary text-white border-primary" : "bg-muted border-border hover:border-primary/40"}`}
                      >{d}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>من الساعة (اختياري)</Label>
                    <Input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
                  </div>
                  <div>
                    <Label>حتى الساعة (اختياري)</Label>
                    <Input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            {/* free_delivery_limited */}
            {form.promo_type === "free_delivery_limited" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-semibold">تاريخ البداية</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} />
                </div>
                <div>
                  <Label className="font-semibold">تاريخ الانتهاء</Label>
                  <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})} />
                </div>
              </div>
            )}

            {/* discount_percent */}
            {form.promo_type === "discount_percent" && (
              <div>
                <Label className="font-semibold">نسبة الخصم (%)</Label>
                <Input type="number" min={1} max={100} value={form.discount_percent} onChange={e => setForm({...form, discount_percent: Number(e.target.value)})} placeholder="15" />
              </div>
            )}

            {/* fixed_discount */}
            {form.promo_type === "fixed_discount" && (
              <div>
                <Label className="font-semibold">مبلغ الخصم (ر.ي)</Label>
                <Input type="number" min={0} value={form.discount_amount} onChange={e => setForm({...form, discount_amount: Number(e.target.value)})} placeholder="500" />
              </div>
            )}

            {/* buy_x_get_y */}
            {form.promo_type === "buy_x_get_y" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-semibold">اطلب (عدد الأصناف)</Label>
                  <Input type="number" min={1} value={form.buy_quantity} onChange={e => setForm({...form, buy_quantity: Number(e.target.value)})} placeholder="3" />
                </div>
                <div>
                  <Label className="font-semibold">وادفع ثمن (عدد)</Label>
                  <Input type="number" min={1} value={form.get_quantity} onChange={e => setForm({...form, get_quantity: Number(e.target.value)})} placeholder="2" />
                </div>
                <div className="col-span-2">
                  <Label>نص العرض للزبون</Label>
                  <Input value={form.promo_text} onChange={e => setForm({...form, promo_text: e.target.value})} placeholder={`اطلب ${form.buy_quantity} وادفع ثمن ${form.get_quantity}`} />
                </div>
              </div>
            )}

            {/* custom_text */}
            {form.promo_type === "custom_text" && (
              <div>
                <Label className="font-semibold">نص العرض المخصص</Label>
                <Textarea value={form.promo_text} onChange={e => setForm({...form, promo_text: e.target.value})} placeholder="مثال: اشترِ وجبتين واحصل على مشروب مجاني" rows={3} />
              </div>
            )}

            {/* Sort order + active toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
                <Label>إظهار للزبائن</Label>
              </div>
              <div className="flex items-center gap-2 mr-auto">
                <Label>الترتيب:</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} className="w-20" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editItem ? "حفظ التعديلات" : "إضافة العرض"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryPromotions;
