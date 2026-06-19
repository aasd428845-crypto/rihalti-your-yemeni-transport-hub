import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Truck, Percent, Minus, CalendarDays, Clock, Gift, Tag, ShoppingBag } from "lucide-react";
import {
  getDeliveryOffers, createDeliveryOffer, updateDeliveryOffer, deleteDeliveryOffer,
  type DeliveryOffer, type OfferType, type SponsorType
} from "@/lib/deliveryOffersApi";
import { getRestaurants } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/common/ImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OFFER_TYPES: { value: OfferType; label: string; icon: any; desc: string; color: string; category: string }[] = [
  // Delivery offers
  { value: "free_delivery",        label: "توصيل مجاني",                  icon: Truck,       desc: "إلغاء رسوم التوصيل بالكامل",                color: "bg-green-500",  category: "delivery" },
  { value: "percent_off_delivery", label: "خصم نسبي على التوصيل",         icon: Percent,     desc: "مثال: خصم 50% على رسوم التوصيل",             color: "bg-blue-500",   category: "delivery" },
  { value: "fixed_off_delivery",   label: "خصم بمبلغ ثابت على التوصيل",   icon: Minus,       desc: "مثال: خصم 500 ر.ي من رسوم التوصيل",          color: "bg-purple-500", category: "delivery" },
  // Order discounts
  { value: "percent_off_order",    label: "خصم نسبي على الطلب",            icon: ShoppingBag, desc: "مثال: خصم 15% على إجمالي قيمة الطلب",        color: "bg-orange-500", category: "order" },
  { value: "fixed_off_order",      label: "خصم بمبلغ ثابت على الطلب",     icon: Tag,         desc: "مثال: خصم 500 ر.ي على كل طلب",              color: "bg-red-500",    category: "order" },
  // Combo
  { value: "buy_x_get_y",          label: "اطلب X وادفع ثمن Y (كومبو)",   icon: Gift,        desc: "مثال: اطلب 3 وادفع ثمن 2",                  color: "bg-yellow-600", category: "combo" },
  // Custom
  { value: "custom",               label: "عرض مخصص بنص حر",              icon: Tag,         desc: "أي عرض تريد كتابة شروطه بشكل مخصص",         color: "bg-gray-500",   category: "custom" },
];

const OFFER_CATEGORY_LABELS: Record<string, string> = {
  delivery: "🚚 عروض التوصيل",
  order:    "🏷️ عروض الخصومات",
  combo:    "🎁 عروض الكومبو",
  custom:   "✏️ عروض مخصصة",
};

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const DELIVERY_OFFER_TYPES_SET = new Set(["free_delivery", "percent_off_delivery", "fixed_off_delivery"]);

const SPONSOR_OPTIONS: { value: SponsorType; label: string; icon: string; desc: string }[] = [
  { value: "restaurant", label: "المطعم",       icon: "🏪", desc: "يُسجَّل مديونية على المطعم" },
  { value: "external",   label: "جهة خارجية",   icon: "🤝", desc: "بنك، شريك أو جهة أخرى" },
  { value: "platform",   label: "الشركة",        icon: "🚚", desc: "تتحمّله شركة التوصيل" },
];

const emptyForm = (): any => ({
  scope: 'restaurant' as 'restaurant' | 'shipment',
  offer_type: "free_delivery" as OfferType,
  title: "",
  description: "",
  image_url: "",
  badge_text: "",
  restaurant_id: "",
  discount_percent: 0,
  discount_amount: 0,
  min_order_amount: 0,
  active_days: [] as string[],
  start_time: "",
  end_time: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
  sort_order: 0,
  sponsor_type: "restaurant" as SponsorType,
  sponsor_name: "",
});

const offerSummary = (o: DeliveryOffer): string => {
  const parts: string[] = [];
  if (o.offer_type === "free_delivery")        parts.push("توصيل مجاني");
  if (o.offer_type === "percent_off_delivery") parts.push(`خصم ${o.discount_percent}% من التوصيل`);
  if (o.offer_type === "fixed_off_delivery")   parts.push(`خصم ${o.discount_amount} ر.ي من التوصيل`);
  if (o.offer_type === "percent_off_order")    parts.push(`خصم ${o.discount_percent}% على الطلب`);
  if (o.offer_type === "fixed_off_order")      parts.push(`خصم ${o.discount_amount} ر.ي على الطلب`);
  if (o.offer_type === "buy_x_get_y")          parts.push("عرض كومبو");
  if (o.offer_type === "custom")               parts.push("عرض مخصص");
  if (o.min_order_amount) parts.push(`بحد أدنى للطلب ${o.min_order_amount} ر.ي`);
  if (o.active_days?.length) parts.push(`أيام: ${o.active_days.join("، ")}`);
  if (o.start_time && o.end_time) parts.push(`من ${o.start_time} حتى ${o.end_time}`);
  if (o.starts_at && o.ends_at) parts.push(`من ${new Date(o.starts_at).toLocaleDateString("ar")} إلى ${new Date(o.ends_at).toLocaleDateString("ar")}`);
  return parts.join(" — ");
};

const isOfferLive = (o: DeliveryOffer): boolean => {
  if (!o.is_active) return false;
  const now = new Date();
  const ARABIC_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const todayName = ARABIC_DAYS[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (o.starts_at && new Date(o.starts_at) > now) return false;
  if (o.ends_at && new Date(o.ends_at) < now) return false;
  if (o.active_days?.length && !o.active_days.includes(todayName)) return false;
  if (o.start_time && currentTime < o.start_time) return false;
  if (o.end_time && currentTime > o.end_time) return false;
  return true;
};

const DeliveryOffers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<DeliveryOffer[]>([]);
  const [restaurants, setRestaurants] = useState<{ id: string; name_ar: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<DeliveryOffer | null>(null);
  const [form, setForm] = useState<any>(emptyForm());

  const load = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getDeliveryOffers(user.id),
      getRestaurants(user.id),
    ])
      .then(([offersData, restaurantsData]) => {
        setOffers(offersData);
        setRestaurants(restaurantsData || []);
      })
      .catch(err => toast({ title: "خطأ", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => { setEditItem(null); setForm(emptyForm()); setShowDialog(true); };
  const openEdit = (o: DeliveryOffer) => {
    setEditItem(o);
    setForm({
      ...emptyForm(), ...o,
      scope: o.scope || 'restaurant',
      active_days: o.active_days || [],
      start_time: o.start_time  || "",
      end_time:   o.end_time    || "",
      starts_at:  o.starts_at   ? new Date(o.starts_at).toISOString().slice(0, 16) : "",
      ends_at:    o.ends_at     ? new Date(o.ends_at).toISOString().slice(0, 16)   : "",
      sponsor_type: o.sponsor_type || "restaurant",
      sponsor_name: o.sponsor_name || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "أدخل عنوان العرض", variant: "destructive" }); return; }
    if (!user) return;
    try {
      const autobadge = form.badge_text ||
        (form.offer_type === "free_delivery"        ? "مجاني" :
         form.offer_type === "percent_off_delivery" ? `خصم ${form.discount_percent}%` :
         form.offer_type === "fixed_off_delivery"   ? `خصم ${form.discount_amount} ر.ي` :
         form.offer_type === "percent_off_order"    ? `خصم ${form.discount_percent}%` :
         form.offer_type === "fixed_off_order"      ? `خصم ${form.discount_amount} ر.ي` :
         form.offer_type === "buy_x_get_y"          ? "كومبو" : "عرض");

      const hasPercentField = ["percent_off_delivery", "percent_off_order"].includes(form.offer_type);
      const hasAmountField  = ["fixed_off_delivery",  "fixed_off_order"].includes(form.offer_type);

      const isDeliveryOfferType = DELIVERY_OFFER_TYPES_SET.has(form.offer_type);

      const payload: any = {
        delivery_company_id: user.id,
        scope: form.scope || 'restaurant',
        offer_type: form.offer_type,
        title: form.title,
        description: form.description || null,
        image_url: form.image_url || null,
        badge_text: autobadge,
        restaurant_id: form.restaurant_id || null,
        discount_percent: hasPercentField ? (form.discount_percent || null) : null,
        discount_amount:  hasAmountField  ? (form.discount_amount  || null) : null,
        min_order_amount: form.min_order_amount || null,
        active_days: form.active_days?.length ? form.active_days : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_active: form.is_active,
        sort_order: form.sort_order || 0,
        sponsor_type: isDeliveryOfferType ? (form.sponsor_type || "restaurant") : null,
        sponsor_name: (isDeliveryOfferType && form.sponsor_type === "external") ? (form.sponsor_name || null) : null,
      };
      if (editItem) {
        await updateDeliveryOffer(editItem.id, payload);
        toast({ title: "تم تحديث العرض ✓" });
      } else {
        await createDeliveryOffer(payload);
        toast({ title: "تمت إضافة العرض ✓" });
      }

      setShowDialog(false);
      load();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا العرض؟")) return;
    try {
      await deleteDeliveryOffer(id);
      toast({ title: "تم حذف العرض" });
      setOffers(prev => prev.filter(x => x.id !== id));
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (o: DeliveryOffer) => {
    try {
      await updateDeliveryOffer(o.id, { is_active: !o.is_active });
      setOffers(prev => prev.map(x => x.id === o.id ? { ...x, is_active: !x.is_active } : x));
    } catch {}
  };

  const toggleDay = (day: string) => {
    const days = form.active_days || [];
    setForm({ ...form, active_days: days.includes(day) ? days.filter((d: string) => d !== day) : [...days, day] });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">العروض</h2>
          <p className="text-sm text-muted-foreground">عروض التوصيل والخصومات والعروض الخاصة بالمطاعم — تُطبَّق تلقائياً في سلة الطلب عند استيفاء الشروط</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" />إضافة عرض</Button>
      </div>

      {/* How it works card */}
      <div className="grid sm:grid-cols-3 gap-3">
        {OFFER_TYPES.map(t => (
          <Card key={t.value} className="border-border/60">
            <CardContent className="p-4 flex gap-3 items-start">
              <div className={`p-2 rounded-xl ${t.color} shrink-0`}>
                <t.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Offers list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Gift className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold text-lg mb-1">لا توجد عروض بعد</p>
            <p className="text-muted-foreground text-sm mb-4">أضف عروض على التوصيل لزيادة جذب الزبائن</p>
            <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" />إضافة عرض</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map(o => {
            const typeInfo = OFFER_TYPES.find(t => t.value === o.offer_type) || OFFER_TYPES[0];
            const live = isOfferLive(o);
            return (
              <Card key={o.id} className={!o.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${typeInfo.color}`}>
                      <typeInfo.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-black text-base">{o.title}</h3>
                        {live && (
                          <Badge className="bg-green-500 text-white border-0 text-[10px] px-2 animate-pulse">
                            🟢 فعّال الآن
                          </Badge>
                        )}
                        {!o.is_active && <Badge variant="secondary" className="text-[10px]">مخفي</Badge>}
                        <Badge variant="outline" className="text-[10px]">{typeInfo.label}</Badge>
                        {/* Sponsor badge */}
                        {o.sponsor_type === "restaurant" && o.restaurant_id && (
                          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                            🏪 {restaurants.find(r => r.id === o.restaurant_id)?.name_ar || "مطعم"} (راعي)
                          </Badge>
                        )}
                        {o.sponsor_type === "external" && (
                          <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-700 bg-blue-50">
                            🤝 {o.sponsor_name || "جهة خارجية"}
                          </Badge>
                        )}
                        {o.sponsor_type === "platform" && (
                          <Badge variant="outline" className="text-[10px] border-green-400 text-green-700 bg-green-50">
                            🚚 الشركة
                          </Badge>
                        )}
                        {/* Scope badge */}
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${o.scope === 'shipment' ? 'border-blue-400 text-blue-700 bg-blue-50' : 'border-green-400 text-green-700 bg-green-50'}`}
                        >
                          {o.scope === 'shipment' ? '📦 شحن طرود' : '🍔 مطاعم'}
                        </Badge>
                        {/* Restaurant link badge — only when restaurant-scoped */}
                        {o.scope !== 'shipment' && o.restaurant_id && o.sponsor_type !== "restaurant" && (
                          <Badge variant="outline" className="text-[10px]">
                            🏪 {restaurants.find(r => r.id === o.restaurant_id)?.name_ar || "مطعم محدد"}
                          </Badge>
                        )}
                        {o.scope !== 'shipment' && !o.restaurant_id && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">جميع المطاعم</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{offerSummary(o)}</p>
                      {o.description && <p className="text-xs text-muted-foreground mt-1">{o.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={o.is_active} onCheckedChange={() => toggleActive(o)} />
                      <Button size="sm" variant="outline" onClick={() => openEdit(o)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(o.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل العرض" : "إضافة عرض جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">

            {/* Scope — what does this offer apply to? */}
            <div>
              <Label className="font-semibold block mb-2">هذا العرض لـ *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, scope: 'restaurant' })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.scope === 'restaurant'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/50 hover:border-primary/40'
                  }`}
                >
                  <span className="text-2xl">🍔</span>
                  <span className="text-sm font-bold">طلبات المطاعم</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">
                    يظهر في الصفحة الرئيسية وينطبق عند طلب وجبات
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, scope: 'shipment' })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.scope === 'shipment'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/50 hover:border-primary/40'
                  }`}
                >
                  <span className="text-2xl">📦</span>
                  <span className="text-sm font-bold">شحن الطرود</span>
                  <span className="text-[11px] text-muted-foreground text-center leading-tight">
                    يظهر في صفحة طلب التوصيل عند شحن الطرود
                  </span>
                </button>
              </div>
            </div>

            {/* Offer type */}
            <div>
              <Label className="font-semibold mb-2 block">نوع العرض *</Label>
              <div className="space-y-3">
                {(["delivery", "order", "combo", "custom"] as const).map(cat => (
                  <div key={cat}>
                    <p className="text-xs font-bold text-muted-foreground mb-1.5 px-1">{OFFER_CATEGORY_LABELS[cat]}</p>
                    <div className="grid gap-1.5">
                      {OFFER_TYPES.filter(t => t.category === cat).map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm({...form, offer_type: t.value})}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-right transition-all ${form.offer_type === t.value ? "bg-primary/10 border-primary font-semibold" : "bg-muted/50 border-border hover:border-primary/40"}`}
                        >
                          <div className={`p-1.5 rounded-lg ${t.color} shrink-0`}><t.icon className="w-4 h-4 text-white" /></div>
                          <div>
                            <p className="text-sm font-semibold">{t.label}</p>
                            <p className="text-xs text-muted-foreground">{t.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="font-semibold">عنوان العرض *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="مثال: توصيل مجاني كل خميس" />
            </div>

            {/* Restaurant link — only for restaurant-scoped offers */}
            {form.scope === 'restaurant' && restaurants.length > 0 && (
              <div>
                <Label className="font-semibold">ربط بمطعم <span className="text-xs text-muted-foreground font-normal">— العرض يُطبَّق على هذا المطعم فقط (اتركه فارغاً لتطبيقه على جميع المطاعم)</span></Label>
                <Select
                  value={form.restaurant_id || "none"}
                  onValueChange={v => setForm({ ...form, restaurant_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر مطعماً (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">جميع المطاعم (لا يُقيَّد بمطعم)</SelectItem>
                    {restaurants.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ─── Sponsor (راعي العرض) — only for delivery offers ─── */}
            {DELIVERY_OFFER_TYPES_SET.has(form.offer_type) && (
              <div>
                <Label className="font-semibold block mb-2">
                  راعي العرض
                  <span className="text-xs text-muted-foreground font-normal mr-1">— من يتحمّل تكلفة هذا العرض؟</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {SPONSOR_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, sponsor_type: s.value })}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${form.sponsor_type === s.value ? "bg-primary/10 border-primary" : "bg-muted/50 border-border hover:border-primary/40"}`}
                    >
                      <span className="text-xl">{s.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{s.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{s.desc}</span>
                    </button>
                  ))}
                </div>
                {form.sponsor_type === "external" && (
                  <div className="mt-2">
                    <Label className="text-xs">اسم الجهة الراعية</Label>
                    <Input
                      value={form.sponsor_name || ""}
                      onChange={e => setForm({ ...form, sponsor_name: e.target.value })}
                      placeholder="مثال: بنك سبأ، فيزا، شركة X"
                      className="mt-1"
                    />
                  </div>
                )}
                {form.sponsor_type === "restaurant" && (
                  <div className="mt-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-300">
                    ⚠️ سيُسجَّل الفرق بين سعر التوصيل الأصلي والمبلغ الذي دفعه العميل كـ<strong>مديونية على المطعم</strong> في صفحة الإدارة المالية
                  </div>
                )}
                {form.sponsor_type === "platform" && (
                  <div className="mt-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 dark:text-blue-300">
                    ℹ️ تكلفة العرض على الشركة — لن يُسجَّل أي مديونية على المطعم
                  </div>
                )}
              </div>
            )}

            {/* Image upload */}
            <div className="grid gap-2">
              <Label className="font-semibold">صورة العرض (تظهر في الكاروسيل)</Label>
              <div className="flex items-start gap-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                <span className="mt-px shrink-0">📐</span>
                <div className="space-y-0.5">
                  <p className="font-semibold">الحجم المناسب: 1200 × 450 بكسل (نسبة 8:3)</p>
                  <p className="text-blue-600 dark:text-blue-500">الصيغة: JPG أو PNG — الحد الأقصى: 1 MB</p>
                </div>
              </div>
              <ImageUpload
                value={form.image_url}
                onChange={url => setForm({...form, image_url: url})}
                bucket="wasal-offers"
                folder="delivery-offers"
                aspectRatio="cover"
                placeholder="ارفع صورة للعرض"
              />
              <div>
                <Label className="text-xs">نص الشارة (مثال: مجاني، خصم 30%)</Label>
                <Input value={form.badge_text} onChange={e => setForm({...form, badge_text: e.target.value})} placeholder="يُحسَب تلقائياً من نوع العرض" />
              </div>
            </div>

            {/* Type-specific fields */}
            {form.offer_type === "percent_off_delivery" && (
              <div>
                <Label className="font-semibold">نسبة الخصم على التوصيل (%)</Label>
                <Input type="number" min={1} max={100} value={form.discount_percent} onChange={e => setForm({...form, discount_percent: Number(e.target.value)})} placeholder="50" />
              </div>
            )}
            {form.offer_type === "fixed_off_delivery" && (
              <div>
                <Label className="font-semibold">مبلغ الخصم من التوصيل (ر.ي)</Label>
                <Input type="number" min={0} value={form.discount_amount} onChange={e => setForm({...form, discount_amount: Number(e.target.value)})} placeholder="500" />
              </div>
            )}
            {form.offer_type === "percent_off_order" && (
              <div>
                <Label className="font-semibold">نسبة الخصم على الطلب (%)</Label>
                <Input type="number" min={1} max={100} value={form.discount_percent} onChange={e => setForm({...form, discount_percent: Number(e.target.value)})} placeholder="15" />
                <p className="text-xs text-muted-foreground mt-1">يُطبَّق على إجمالي قيمة الوجبات (قبل رسوم التوصيل)</p>
              </div>
            )}
            {form.offer_type === "fixed_off_order" && (
              <div>
                <Label className="font-semibold">مبلغ الخصم على الطلب (ر.ي)</Label>
                <Input type="number" min={0} value={form.discount_amount} onChange={e => setForm({...form, discount_amount: Number(e.target.value)})} placeholder="500" />
                <p className="text-xs text-muted-foreground mt-1">يُخصَم من إجمالي قيمة الوجبات مباشرةً</p>
              </div>
            )}
            {form.offer_type === "buy_x_get_y" && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                💡 اكتب تفاصيل الكومبو في عنوان العرض ووصفه (مثال: عنوان "اطلب 3 برغر وادفع ثمن 2" ووصف الشروط)
              </div>
            )}

            {/* Min order */}
            <div>
              <Label className="font-semibold flex items-center gap-1.5">الحد الأدنى للطلب (ر.ي) <span className="text-xs text-muted-foreground font-normal">اختياري</span></Label>
              <Input type="number" min={0} value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: Number(e.target.value)})} placeholder="0 = بدون حد أدنى" />
            </div>

            {/* Days */}
            <div>
              <Label className="font-semibold flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />الأيام الفعّالة <span className="text-xs text-muted-foreground font-normal">اتركها فارغة للتطبيق يومياً</span></Label>
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

            {/* Time range */}
            <div>
              <Label className="font-semibold flex items-center gap-1.5"><Clock className="w-4 h-4" />نطاق الوقت <span className="text-xs text-muted-foreground font-normal">اختياري</span></Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <Label className="text-xs">من الساعة</Label>
                  <Input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
                </div>
                <div>
                  <Label className="text-xs">حتى الساعة</Label>
                  <Input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Date range */}
            <div>
              <Label className="font-semibold flex items-center gap-1.5"><CalendarDays className="w-4 h-4" />فترة العرض <span className="text-xs text-muted-foreground font-normal">اختياري</span></Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div>
                  <Label className="text-xs">يبدأ في</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} />
                </div>
                <div>
                  <Label className="text-xs">ينتهي في</Label>
                  <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>وصف إضافي (اختياري)</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="ملاحظات للزبائن..." rows={2} />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label>تفعيل العرض الآن</Label>
            </div>
          </div>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editItem ? "تحديث العرض" : "حفظ العرض"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryOffers;
