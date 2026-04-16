import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ImageIcon, Tag, MonitorPlay, LayoutGrid } from "lucide-react";
import { getBannersForPortal, createBanner, updateBanner, deleteBanner } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/common/ImageUpload";

const CITIES = ["الكل", "صنعاء", "عدن", "تعز", "المكلا", "إب", "الحديدة", "ذمار", "سيئون"];

const TAB_OPTIONS = [
  { value: "restaurants", label: "🍔 مطاعم وتوصيل" },
  { value: "grocery", label: "🛒 بقالة وتسوق" },
  { value: "pharmacy", label: "💊 صيدليات" },
  { value: "more", label: "📦 توصيل أي شيء" },
];

const GRADIENT_OPTIONS = [
  { value: "from-orange-500 to-amber-500", label: "برتقالي ذهبي", preview: "bg-gradient-to-br from-orange-500 to-amber-500" },
  { value: "from-emerald-500 to-green-500", label: "أخضر", preview: "bg-gradient-to-br from-emerald-500 to-green-500" },
  { value: "from-blue-500 to-sky-500", label: "أزرق سماوي", preview: "bg-gradient-to-br from-blue-500 to-sky-500" },
  { value: "from-purple-500 to-pink-500", label: "بنفسجي وردي", preview: "bg-gradient-to-br from-purple-500 to-pink-500" },
  { value: "from-red-500 to-rose-500", label: "أحمر", preview: "bg-gradient-to-br from-red-500 to-rose-500" },
  { value: "from-teal-500 to-cyan-500", label: "تيل فيروزي", preview: "bg-gradient-to-br from-teal-500 to-cyan-500" },
  { value: "from-yellow-500 to-orange-400", label: "أصفر برتقالي", preview: "bg-gradient-to-br from-yellow-500 to-orange-400" },
  { value: "from-indigo-500 to-purple-600", label: "نيلي بنفسجي", preview: "bg-gradient-to-br from-indigo-500 to-purple-600" },
];

const BANNER_TYPES = [
  { value: "carousel", label: "بنر متحرك", icon: MonitorPlay, desc: "يظهر في الكاروسيل المتحرك أعلى الصفحة" },
  { value: "offer", label: "بطاقة عرض", icon: Tag, desc: "يظهر في قسم العروض والخصومات" },
  { value: "service_tile", label: "أيقونة خدمة", icon: LayoutGrid, desc: "يظهر في شبكة الأيقونات الأربع (المطاعم، البقالة...)" },
];

const emptyForm = () => ({
  title: "",
  subtitle: "",
  image_url: "",
  link_tab: "restaurants",
  link_url: "",
  badge_text: "",
  city: "",
  is_active: true,
  sort_order: 0,
  banner_type: "carousel",
  tile_action: "restaurants",
  tile_gradient: "from-orange-500 to-amber-500",
});

const DeliveryBanners = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());
  const [activeFilter, setActiveFilter] = useState<"all" | "carousel" | "offer" | "service_tile">("all");

  const load = async () => {
    if (!user) return;
    try {
      const data = await getBannersForPortal(user.id);
      setBanners(data);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const openNew = (defaultType?: string) => {
    setEditItem(null);
    setForm({ ...emptyForm(), banner_type: defaultType || "carousel" });
    setShowDialog(true);
  };

  const openEdit = (b: any) => {
    setEditItem(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image_url: b.image_url || "",
      link_tab: b.link_tab || "restaurants",
      link_url: b.link_url || "",
      badge_text: b.badge_text || "",
      city: b.city || "",
      is_active: b.is_active !== false,
      sort_order: b.sort_order || 0,
      banner_type: b.banner_type || "carousel",
      tile_action: b.tile_action || "restaurants",
      tile_gradient: b.tile_gradient || "from-orange-500 to-amber-500",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!user || !form.image_url.trim()) {
      toast({ title: "يرجى رفع صورة أولاً", variant: "destructive" }); return;
    }
    if (form.banner_type === "service_tile" && !form.title.trim()) {
      toast({ title: "يرجى إدخال اسم الأيقونة", variant: "destructive" }); return;
    }
    try {
      const payload = {
        ...form,
        city: form.city && form.city !== "الكل" ? form.city : null,
        delivery_company_id: user.id,
      };
      if (editItem) {
        await updateBanner(editItem.id, payload);
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createBanner(payload);
        toast({ title: "تمت الإضافة بنجاح" });
      }
      setShowDialog(false); setEditItem(null); load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا العنصر؟")) return;
    try {
      await deleteBanner(id);
      toast({ title: "تم الحذف" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (b: any) => {
    try {
      await updateBanner(b.id, { is_active: !b.is_active });
      load();
    } catch {}
  };

  const filteredBanners = banners.filter(b => {
    if (activeFilter === "all") return true;
    return b.banner_type === activeFilter;
  });

  const getBannerTypeInfo = (type: string) => BANNER_TYPES.find(t => t.value === type) || BANNER_TYPES[0];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">إدارة البنرات والأيقونات</h2>
          <p className="text-sm text-muted-foreground mt-0.5">تحكم في جميع المحتوى المرئي الذي يظهر للزبائن</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => openNew("service_tile")}>
            <LayoutGrid className="w-4 h-4 ml-1" /> إضافة أيقونة خدمة
          </Button>
          <Button onClick={() => openNew()}>
            <Plus className="w-4 h-4 ml-1" /> إضافة بنر / عرض
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "الكل" },
          { key: "carousel", label: "بنرات متحركة", icon: <MonitorPlay className="w-3.5 h-3.5" /> },
          { key: "offer", label: "عروض", icon: <Tag className="w-3.5 h-3.5" /> },
          { key: "service_tile", label: "أيقونات الخدمات", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${ activeFilter === f.key ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50" }`}
          >
            {"icon" in f && f.icon}{f.label}
          </button>
        ))}
      </div>

      {/* Info banner for service tiles */}
      {activeFilter === "service_tile" && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
          <p className="font-bold mb-1">💡 كيف تعمل أيقونات الخدمات؟</p>
          <p>هذه هي الأيقونات الأربع التي تظهر في منتصف صفحة التوصيل. إذا أضفت أيقونات هنا، ستحل محل الأيقونات الافتراضية. يمكنك إضافة أكثر من 4 أيقونات.</p>
        </div>
      )}

      {filteredBanners.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold text-lg mb-1">لا يوجد محتوى بعد</p>
            <p className="text-muted-foreground text-sm mb-4">
              {activeFilter === "service_tile"
                ? "أضف أيقونات خدمات مخصصة لتحل محل الافتراضية"
                : "أضف بنرات أو عروض لتظهر للزبائن"}
            </p>
            <Button onClick={() => openNew(activeFilter === "all" ? undefined : activeFilter)}>
              <Plus className="w-4 h-4 ml-1" /> إضافة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBanners.map((b) => {
            const typeInfo = getBannerTypeInfo(b.banner_type);
            const isServiceTile = b.banner_type === "service_tile";
            return (
              <Card key={b.id} className={`overflow-hidden transition-all ${!b.is_active ? "opacity-60" : ""}`}>
                <div className={`relative ${isServiceTile ? "h-28" : "h-36"}`}>
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {/* Gradient overlay for service tiles */}
                  {isServiceTile && b.tile_gradient && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${b.tile_gradient} opacity-75`} />
                  )}
                  {!isServiceTile && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  )}
                  {/* Type badge */}
                  <Badge className={`absolute top-2 left-2 border-0 text-white text-[10px] ${b.banner_type === "offer" ? "bg-red-500" : b.banner_type === "service_tile" ? "bg-primary" : "bg-blue-600"}`}>
                    <typeInfo.icon className="w-2.5 h-2.5 ml-0.5" />
                    {typeInfo.label}
                  </Badge>
                  {!isServiceTile && b.badge_text && (
                    <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-0">{b.badge_text}</Badge>
                  )}
                  {b.title && (
                    <div className={`absolute text-white ${isServiceTile ? "bottom-0 right-0 left-0 p-2 flex items-center justify-center" : "bottom-2 right-2 left-2"}`}>
                      <p className={`font-black drop-shadow ${isServiceTile ? "text-sm text-center" : "text-sm"}`}>{b.title}</p>
                      {!isServiceTile && b.subtitle && <p className="text-xs text-white/80 drop-shadow">{b.subtitle}</p>}
                    </div>
                  )}
                  {!b.is_active && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-full">مخفي</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {isServiceTile
                      ? <span>يوجه إلى: {TAB_OPTIONS.find(t => t.value === b.tile_action)?.label || b.tile_action}</span>
                      : <span className="truncate block max-w-full">{b.link_url ? `🔗 ${b.link_url}` : (TAB_OPTIONS.find(t => t.value === b.link_tab)?.label || "مطاعم")}</span>
                    }
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} className="scale-90" />
                    <span className="text-xs text-muted-foreground">{b.is_active ? "مرئي" : "مخفي"}</span>
                    <div className="flex gap-1 mr-auto">
                      <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
            <DialogTitle>{editItem ? "تعديل العنصر" : "إضافة عنصر جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Type selector */}
            <div>
              <Label className="font-semibold">نوع المحتوى</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {BANNER_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({...form, banner_type: t.value})}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-semibold transition-all ${form.banner_type === t.value ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"}`}
                  >
                    <t.icon className="w-5 h-5" />
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {getBannerTypeInfo(form.banner_type).desc}
              </p>
            </div>

            {/* Image upload */}
            <div>
              <Label className="font-semibold flex items-center gap-1">
                الصورة <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {form.banner_type === "carousel" ? "يُفضّل أبعاد 1200×400" :
                 form.banner_type === "service_tile" ? "يُفضّل صورة مربعة أو 600×400" :
                 "يُفضّل أبعاد 600×400"}
              </p>
              {form.image_url ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={form.image_url} alt="preview" className="w-full h-32 object-cover" />
                  {form.banner_type === "service_tile" && form.tile_gradient && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${form.tile_gradient} opacity-60`} />
                  )}
                  <Button size="sm" variant="destructive" className="absolute top-2 left-2" onClick={() => setForm({...form, image_url: ""})}>
                    تغيير
                  </Button>
                </div>
              ) : (
                <ImageUpload
                  bucket="restaurants"
                  aspectRatio="cover"
                  onChange={(url) => setForm({...form, image_url: url})}
                  placeholder="اضغط لرفع الصورة"
                />
              )}
            </div>

            {/* Service tile specific: gradient + action */}
            {form.banner_type === "service_tile" && (
              <>
                <div>
                  <Label className="font-semibold">اسم الأيقونة <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="مثال: مطاعم وتوصيل"
                  />
                </div>
                <div>
                  <Label className="font-semibold">عند الضغط ينتقل إلى</Label>
                  <Select value={form.tile_action} onValueChange={v => setForm({...form, tile_action: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TAB_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      <SelectItem value="more">📦 صفحة التوصيل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-semibold">لون التأثير (Gradient)</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {GRADIENT_OPTIONS.map(g => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setForm({...form, tile_gradient: g.value})}
                        title={g.label}
                        className={`h-10 rounded-lg ${g.preview} transition-all ${form.tile_gradient === g.value ? "ring-2 ring-offset-2 ring-foreground scale-105" : "hover:scale-105"}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>الترتيب</Label>
                  <Input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} />
                </div>
              </>
            )}

            {/* Carousel/Offer specific fields */}
            {form.banner_type !== "service_tile" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>العنوان الرئيسي</Label>
                  <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="مثال: عروض رمضان" />
                </div>
                <div>
                  <Label>العنوان الفرعي</Label>
                  <Input value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} placeholder="مثال: خصم 30%" />
                </div>
                <div>
                  <Label>نص الشارة (اختياري)</Label>
                  <Input value={form.badge_text} onChange={e => setForm({...form, badge_text: e.target.value})} placeholder="مثال: عرض محدود" />
                </div>
                <div>
                  <Label>الترتيب</Label>
                  <Input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} />
                </div>
                <div>
                  <Label>يوجه إلى (قسم)</Label>
                  <Select value={form.link_tab} onValueChange={v => setForm({...form, link_tab: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TAB_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المدينة (اختياري)</Label>
                  <Select value={form.city || "الكل"} onValueChange={v => setForm({...form, city: v === "الكل" ? "" : v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>رابط مخصص (اختياري)</Label>
                  <Input value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="مثال: /restaurants أو https://..." />
                  <p className="text-xs text-muted-foreground mt-1">اتركه فارغاً لاستخدام القسم المحدد أعلاه</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label>إظهار للزبائن</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.image_url}>
              {editItem ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryBanners;
