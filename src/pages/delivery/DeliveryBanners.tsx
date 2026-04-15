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
import { Plus, Pencil, Trash2, GripVertical, ImageIcon, Eye, EyeOff } from "lucide-react";
import { getBannersForPortal, createBanner, updateBanner, deleteBanner } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/common/ImageUpload";

const CITIES = ["الكل", "صنعاء", "عدن", "تعز", "المكلا", "إب", "الحديدة", "ذمار", "سيئون"];
const TAB_OPTIONS = [
  { value: "restaurants", label: "مطاعم" },
  { value: "grocery", label: "بقالة" },
  { value: "pharmacy", label: "صيدلية" },
];

const emptyForm = () => ({
  title: "",
  subtitle: "",
  image_url: "",
  link_tab: "restaurants",
  badge_text: "",
  city: "",
  is_active: true,
  sort_order: 0,
});

const DeliveryBanners = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());

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

  const openNew = () => {
    setEditItem(null);
    setForm(emptyForm());
    setShowDialog(true);
  };

  const openEdit = (b: any) => {
    setEditItem(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image_url: b.image_url || "",
      link_tab: b.link_tab || "restaurants",
      badge_text: b.badge_text || "",
      city: b.city || "",
      is_active: b.is_active !== false,
      sort_order: b.sort_order || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!user || !form.image_url.trim()) {
      toast({ title: "يرجى رفع صورة البنر", variant: "destructive" }); return;
    }
    try {
      const payload = {
        ...form,
        city: form.city && form.city !== "الكل" ? form.city : null,
        delivery_company_id: user.id,
      };
      if (editItem) {
        await updateBanner(editItem.id, payload);
        toast({ title: "تم تحديث البنر" });
      } else {
        await createBanner(payload);
        toast({ title: "تم إضافة البنر بنجاح" });
      }
      setShowDialog(false); setEditItem(null); load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا البنر؟")) return;
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

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">إدارة البنرات الإعلانية</h2>
          <p className="text-sm text-muted-foreground mt-0.5">تظهر هذه البنرات في صفحة التوصيل للزبائن</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 ml-1" /> إضافة بنر
        </Button>
      </div>

      {banners.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-bold text-lg mb-1">لا توجد بنرات بعد</p>
            <p className="text-muted-foreground text-sm mb-4">أضف بنرات إعلانية لتظهر في صفحة التوصيل وتجذب الزبائن</p>
            <Button onClick={openNew}><Plus className="w-4 h-4 ml-1" /> إضافة أول بنر</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <Card key={b.id} className={`overflow-hidden transition-all ${!b.is_active ? "opacity-60" : ""}`}>
              <div className="relative h-36">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {b.badge_text && (
                  <Badge className="absolute top-2 right-2 bg-amber-500 text-white border-0">{b.badge_text}</Badge>
                )}
                {b.title && (
                  <div className="absolute bottom-2 right-2 left-2 text-white">
                    <p className="font-bold text-sm drop-shadow">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-white/80 drop-shadow">{b.subtitle}</p>}
                  </div>
                )}
                {!b.is_active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-full">مخفي</span>
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>الصفحة: {TAB_OPTIONS.find(t => t.value === b.link_tab)?.label || "مطاعم"}</span>
                  {b.city && <Badge variant="outline" className="text-xs">{b.city}</Badge>}
                  <span className="font-mono">ترتيب #{b.sort_order}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={b.is_active}
                    onCheckedChange={() => toggleActive(b)}
                    className="scale-90"
                  />
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
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل البنر" : "إضافة بنر جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold flex items-center gap-1">
                صورة البنر <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">يُفضّل أبعاد 1200×400 للجودة المثالية</p>
              {form.image_url ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={form.image_url} alt="preview" className="w-full h-36 object-cover" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 left-2"
                    onClick={() => setForm({...form, image_url: ""})}
                  >
                    حذف
                  </Button>
                </div>
              ) : (
                <ImageUpload
                  bucket="restaurants"
                  aspectRatio="cover"
                  onChange={(url) => setForm({...form, image_url: url})}
                  placeholder="اضغط لرفع صورة البنر (1200×400 مثالي)"
                />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>العنوان الرئيسي</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="مثال: عروض رمضان"
                />
              </div>
              <div>
                <Label>العنوان الفرعي</Label>
                <Input
                  value={form.subtitle}
                  onChange={e => setForm({...form, subtitle: e.target.value})}
                  placeholder="مثال: خصم 30% على كل الطلبات"
                />
              </div>
              <div>
                <Label>نص الشارة (اختياري)</Label>
                <Input
                  value={form.badge_text}
                  onChange={e => setForm({...form, badge_text: e.target.value})}
                  placeholder="مثال: عرض محدود"
                />
              </div>
              <div>
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm({...form, sort_order: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>يوجه إلى</Label>
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
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm({...form, is_active: v})}
              />
              <Label>إظهار البنر للزبائن</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={!form.image_url}>
              {editItem ? "حفظ التعديلات" : "إضافة البنر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryBanners;
