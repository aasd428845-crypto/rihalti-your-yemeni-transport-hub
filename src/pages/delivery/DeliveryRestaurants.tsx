import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Store, Edit, Trash2, Search, Star, Clock, Truck, Menu } from "lucide-react";
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import ImageUpload from "@/components/common/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DAYS = [
  { key: "saturday", label: "السبت" },
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الاثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
  { key: "friday", label: "الجمعة" },
];

const cuisineOptions = ["يمني", "مصري", "شامي", "إيطالي", "صيني", "برجر", "بيتزا", "مشويات", "مأكولات بحرية", "حلويات", "مشروبات", "شاورما", "مرق", "فطور"];

const defaultHours = () => Object.fromEntries(DAYS.map(d => [d.key, { open: true, from: "09:00", to: "23:00" }]));

const CITIES = ["صنعاء", "عدن", "تعز", "المكلا", "إب", "الحديدة", "ذمار", "سيئون"];

const emptyForm = () => ({
  name_ar: "", name_en: "", description: "", phone: "", address: "",
  city: "",
  commission_rate: 0, delivery_fee: 0, min_order_amount: 0,
  estimated_delivery_time: 30, is_featured: false, cuisine_type: [] as string[],
  cover_image: "", logo_url: "",
  coverage_areas: [] as string[],
  opening_hours: defaultHours() as Record<string, { open: boolean; from: string; to: string }>,
});

const DeliveryRestaurants = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());
  const [coverageInput, setCoverageInput] = useState("");
  const [profileCity, setProfileCity] = useState("");

  // Load company's city from profile to pre-fill new restaurant city
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("city").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.city) setProfileCity(data.city);
      });
  }, [user]);

  const load = async () => {
    if (!user) return;
    try {
      const data = await getRestaurants(user.id);
      setRestaurants(data || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.name_ar.trim()) {
      toast({ title: "يرجى إدخال اسم المطعم", variant: "destructive" }); return;
    }
    if (!form.city) {
      toast({ title: "يرجى تحديد مدينة المطعم", variant: "destructive" }); return;
    }
    try {
      // Base payload without coverage_areas — handles case where migration not yet applied
      const basePayload = {
        name_ar: form.name_ar, name_en: form.name_en || null,
        description: form.description || null, phone: form.phone || null,
        address: form.address || null, city: form.city,
        commission_rate: form.commission_rate, delivery_fee: form.delivery_fee,
        min_order_amount: form.min_order_amount, estimated_delivery_time: form.estimated_delivery_time,
        is_featured: form.is_featured,
        cuisine_type: form.cuisine_type.length > 0 ? form.cuisine_type : null,
        cover_image: form.cover_image || null, logo_url: form.logo_url || null,
        opening_hours: form.opening_hours,
      };

      // Try to include coverage_areas (requires migration); fall back to base payload if column missing
      const payloadWithCoverage = { ...basePayload, coverage_areas: form.coverage_areas };

      let savedId = editItem?.id;
      try {
        if (editItem) {
          await updateRestaurant(editItem.id, payloadWithCoverage);
        } else {
          const created = await createRestaurant({ ...payloadWithCoverage, delivery_company_id: user.id });
          savedId = created?.id;
        }
      } catch (coverageErr: any) {
        // If coverage_areas column doesn't exist yet, retry without it
        if (coverageErr?.message?.includes("coverage_areas") || coverageErr?.code === "42703") {
          if (editItem) {
            await updateRestaurant(editItem.id, basePayload);
          } else {
            const created = await createRestaurant({ ...basePayload, delivery_company_id: user.id });
            savedId = created?.id;
          }
          toast({
            title: editItem ? "تم التحديث" : "تمت إضافة المطعم",
            description: "ملاحظة: لم تُطبَّق مناطق التغطية. طبّق migration قاعدة البيانات لتفعيلها.",
          });
          setShowAdd(false); setEditItem(null); setForm(emptyForm()); load();
          return;
        }
        throw coverageErr;
      }

      toast({ title: editItem ? "تم التحديث بنجاح" : "تمت إضافة المطعم بنجاح" });
      setShowAdd(false); setEditItem(null); setForm(emptyForm()); load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا المطعم؟")) return;
    try {
      await deleteRestaurant(id);
      toast({ title: "تم حذف المطعم" }); load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ ...emptyForm(), city: profileCity });
    setShowAdd(true);
  };

  const openEdit = (r: any) => {
    setEditItem(r);
    const hours = r.opening_hours && typeof r.opening_hours === "object" ? r.opening_hours : defaultHours();
    setForm({
      name_ar: r.name_ar, name_en: r.name_en || "", description: r.description || "",
      phone: r.phone || "", address: r.address || "",
      city: r.city || profileCity || "",
      commission_rate: r.commission_rate || 0, delivery_fee: r.delivery_fee || 0,
      min_order_amount: r.min_order_amount || 0, estimated_delivery_time: r.estimated_delivery_time || 30,
      is_featured: r.is_featured || false, cuisine_type: r.cuisine_type || [],
      cover_image: r.cover_image || "", logo_url: r.logo_url || "",
      coverage_areas: r.coverage_areas || [],
      opening_hours: hours,
    });
    setShowAdd(true);
  };

  const addCoverageArea = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !form.coverage_areas.includes(trimmed)) {
      setForm(f => ({ ...f, coverage_areas: [...f.coverage_areas, trimmed] }));
    }
    setCoverageInput("");
  };

  const removeCoverageArea = (area: string) => {
    setForm(f => ({ ...f, coverage_areas: f.coverage_areas.filter(a => a !== area) }));
  };

  const toggleCuisine = (c: string) => {
    setForm(f => ({ ...f, cuisine_type: f.cuisine_type.includes(c) ? f.cuisine_type.filter(x => x !== c) : [...f.cuisine_type, c] }));
  };

  const setDayHours = (day: string, field: string, value: any) => {
    setForm(f => ({ ...f, opening_hours: { ...f.opening_hours, [day]: { ...f.opening_hours[day], [field]: value } } }));
  };

  const filtered = restaurants.filter(r => r.name_ar?.includes(search) || r.phone?.includes(search));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">إدارة المطاعم</h2>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 ml-1" /> إضافة مطعم
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد مطاعم حتى الآن</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <div className="h-36 bg-gradient-to-br from-primary/10 to-primary/5 relative">
                {r.cover_image
                  ? <img src={r.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  : <div className="w-full h-full flex items-center justify-center text-muted-foreground/30"><Store className="w-16 h-16" /></div>}
                {r.is_featured && <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500">⭐ مميز</Badge>}
                <Badge variant={r.is_active ? "default" : "secondary"} className="absolute top-2 right-2">
                  {r.is_active ? "نشط" : "معطل"}
                </Badge>
                {r.logo_url && (
                  <div className="absolute bottom-0 translate-y-1/2 right-4 w-14 h-14 rounded-full border-2 border-background bg-background overflow-hidden shadow-md">
                    <img src={r.logo_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
              </div>
              <CardContent className={`p-4 space-y-3 ${r.logo_url ? "pt-10" : ""}`}>
                <div className="flex items-center gap-2">
                  {!r.logo_url && <Store className="w-5 h-5 text-primary shrink-0" />}
                  <h3 className="font-bold text-lg">{r.name_ar}</h3>
                </div>
                {r.cuisine_type && r.cuisine_type.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {r.cuisine_type.slice(0, 4).map((c: string) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{r.rating || 0}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.estimated_delivery_time || 30} د</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{r.delivery_fee || 0} ر.ي</span>
                </div>
                {r.city ? (
                  <p className="text-xs text-muted-foreground">📍 {r.city}</p>
                ) : (
                  <p className="text-xs text-destructive font-semibold bg-destructive/10 rounded px-2 py-1">
                    ⚠️ لم تُحدَّد المدينة — المطعم لن يظهر للزبائن! اضغط تعديل لإصلاحها.
                  </p>
                )}
                {r.phone && <p className="text-sm text-muted-foreground">📞 {r.phone}</p>}
                <p className="text-sm text-muted-foreground">العمولة: {r.commission_rate}%</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="default" onClick={() => navigate(`/delivery/menu/${r.id}`)}>
                    <Menu className="w-3 h-3 ml-1" /> المنيو
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Edit className="w-3 h-3 ml-1" /> تعديل</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) setEditItem(null); }}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? "تعديل مطعم" : "إضافة مطعم جديد"}</DialogTitle></DialogHeader>

          <div className="space-y-5">
            {/* Images */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">الصور</Label>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-1">
                  <Label className="text-sm text-muted-foreground">صورة الغلاف</Label>
                  <ImageUpload
                    value={form.cover_image}
                    onChange={url => setForm(f => ({ ...f, cover_image: url }))}
                    bucket="restaurant-covers"
                    aspectRatio="cover"
                    placeholder="اضغط لرفع صورة الغلاف"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">شعار المطعم</Label>
                  <ImageUpload
                    value={form.logo_url}
                    onChange={url => setForm(f => ({ ...f, logo_url: url }))}
                    bucket="restaurant-logos"
                    aspectRatio="logo"
                    placeholder="الشعار"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>الاسم بالعربية *</Label>
                <Input value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} placeholder="اسم المطعم" />
              </div>
              <div className="sm:col-span-2">
                <Label>الاسم بالإنجليزية</Label>
                <Input value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} placeholder="Restaurant Name" />
              </div>
              <div className="sm:col-span-2">
                <Label>وصف المطعم</Label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="وصف مختصر عن المطعم..." rows={2} />
              </div>
            </div>

            {/* Cuisine */}
            <div>
              <Label className="text-base font-semibold">نوع المطبخ</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {cuisineOptions.map(c => (
                  <Badge key={c} variant={form.cuisine_type.includes(c) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => toggleCuisine(c)}>{c}</Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Contact & Numbers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="font-semibold flex items-center gap-1">
                  المدينة <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-1">يُستخدم لعرض المطعم للزبائن في نفس المدينة</p>
                <Select value={form.city} onValueChange={v => setForm({...form, city: v})}>
                  <SelectTrigger className={!form.city ? "border-destructive/50" : ""}>
                    <SelectValue placeholder="اختر مدينة المطعم..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="7XX XXX XXX" />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="موقع المطعم" />
              </div>
              <div>
                <Label>نسبة العمولة %</Label>
                <Input type="number" value={form.commission_rate} onChange={e => setForm({...form, commission_rate: Number(e.target.value)})} />
              </div>
              <div>
                <Label>رسوم التوصيل (ر.ي)</Label>
                <Input type="number" value={form.delivery_fee} onChange={e => setForm({...form, delivery_fee: Number(e.target.value)})} />
              </div>
              <div className="sm:col-span-2">
                <Label>مناطق التغطية المحددة</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  اتركها فارغة لتشمل كامل المدينة. أضف أسماء الأحياء/المناطق التي يوصل إليها المطعم فقط.
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={coverageInput}
                    onChange={e => setCoverageInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCoverageArea(coverageInput); } }}
                    placeholder="اسم الحي أو المنطقة..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addCoverageArea(coverageInput)}>إضافة</Button>
                </div>
                {form.coverage_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.coverage_areas.map(area => (
                      <Badge key={area} variant="secondary" className="gap-1.5 pl-2">
                        {area}
                        <button
                          type="button"
                          onClick={() => removeCoverageArea(area)}
                          className="hover:text-destructive transition-colors"
                        >×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>الحد الأدنى للطلب (ر.ي)</Label>
                <Input type="number" value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: Number(e.target.value)})} />
              </div>
              <div>
                <Label>وقت التوصيل التقديري (دقائق)</Label>
                <Input type="number" value={form.estimated_delivery_time} onChange={e => setForm({...form, estimated_delivery_time: Number(e.target.value)})} />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm({...form, is_featured: v})} />
                <div>
                  <Label>مطعم مميز ⭐</Label>
                  <p className="text-xs text-muted-foreground">يظهر في قسم "الأكثر طلباً"</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Opening Hours */}
            <div>
              <Label className="text-base font-semibold">ساعات العمل</Label>
              <div className="mt-3 space-y-2">
                {DAYS.map(day => (
                  <div key={day.key} className="flex items-center gap-3 flex-wrap">
                    <div className="w-20">
                      <Switch
                        checked={form.opening_hours[day.key]?.open ?? true}
                        onCheckedChange={v => setDayHours(day.key, "open", v)}
                      />
                    </div>
                    <span className={`w-20 text-sm font-medium ${!(form.opening_hours[day.key]?.open ?? true) ? "text-muted-foreground" : ""}`}>{day.label}</span>
                    {(form.opening_hours[day.key]?.open ?? true) ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="time"
                          value={form.opening_hours[day.key]?.from || "09:00"}
                          onChange={e => setDayHours(day.key, "from", e.target.value)}
                          className="w-32 text-sm"
                        />
                        <span className="text-muted-foreground text-sm">إلى</span>
                        <Input
                          type="time"
                          value={form.opening_hours[day.key]?.to || "23:00"}
                          onChange={e => setDayHours(day.key, "to", e.target.value)}
                          className="w-32 text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">مغلق</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleSave}>{editItem ? "تحديث المطعم" : "إضافة المطعم"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryRestaurants;
