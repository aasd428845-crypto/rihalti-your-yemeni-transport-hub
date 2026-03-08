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
import { Plus, Store, Edit, Trash2, Search, UtensilsCrossed, Star, Clock, Truck, Menu } from "lucide-react";
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import type { Restaurant } from "@/types/delivery.types";

const DeliveryRestaurants = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    name_ar: "", name_en: "", description: "", phone: "", address: "",
    commission_rate: 0, delivery_fee: 0, min_order_amount: 0,
    estimated_delivery_time: 30, is_featured: false, cuisine_type: [] as string[],
  });

  const cuisineOptions = ["يمني", "مصري", "شامي", "إيطالي", "صيني", "برجر", "بيتزا", "مشويات", "مأكولات بحرية", "حلويات", "مشروبات"];

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

  const resetForm = () => setForm({
    name_ar: "", name_en: "", description: "", phone: "", address: "",
    commission_rate: 0, delivery_fee: 0, min_order_amount: 0,
    estimated_delivery_time: 30, is_featured: false, cuisine_type: [],
  });

  const handleSave = async () => {
    if (!user || !form.name_ar.trim()) return;
    try {
      const payload = { ...form, cuisine_type: form.cuisine_type.length > 0 ? form.cuisine_type : null };
      if (editItem) {
        await updateRestaurant(editItem.id, payload);
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createRestaurant({ ...payload, delivery_company_id: user.id });
        toast({ title: "تمت إضافة المطعم بنجاح" });
      }
      setShowAdd(false); setEditItem(null); resetForm(); load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRestaurant(id);
      toast({ title: "تم حذف المطعم" }); load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (r: any) => {
    setEditItem(r);
    setForm({
      name_ar: r.name_ar, name_en: r.name_en || "", description: r.description || "",
      phone: r.phone || "", address: r.address || "",
      commission_rate: r.commission_rate || 0, delivery_fee: r.delivery_fee || 0,
      min_order_amount: r.min_order_amount || 0, estimated_delivery_time: r.estimated_delivery_time || 30,
      is_featured: r.is_featured || false, cuisine_type: r.cuisine_type || [],
    });
    setShowAdd(true);
  };

  const toggleCuisine = (c: string) => {
    setForm(f => ({ ...f, cuisine_type: f.cuisine_type.includes(c) ? f.cuisine_type.filter(x => x !== c) : [...f.cuisine_type, c] }));
  };

  const filtered = restaurants.filter(r => r.name_ar?.includes(search) || r.phone?.includes(search));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">إدارة المطاعم</h2>
        <Button onClick={() => { setEditItem(null); resetForm(); setShowAdd(true); }}>
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
            <Card key={r.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 relative">
                {r.cover_image && <img src={r.cover_image} alt="" className="w-full h-full object-cover" />}
                {r.is_featured && <Badge className="absolute top-2 left-2 bg-primary">مميز</Badge>}
                <Badge variant={r.is_active ? "default" : "secondary"} className="absolute top-2 right-2">
                  {r.is_active ? "نشط" : "معطل"}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary shrink-0" />
                  <h3 className="font-bold text-lg">{r.name_ar}</h3>
                </div>
                {r.cuisine_type && r.cuisine_type.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {r.cuisine_type.map((c: string) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{r.rating || 0}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.estimated_delivery_time || 30} د</span>
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{r.delivery_fee || 0} ر.ي</span>
                </div>
                {r.phone && <p className="text-sm text-muted-foreground">📞 {r.phone}</p>}
                <p className="text-sm text-muted-foreground">العمولة: {r.commission_rate}%</p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="default" onClick={() => navigate(`/delivery/restaurants/${r.id}/menu`)}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>الاسم بالعربية *</Label><Input value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>الاسم بالإنجليزية</Label><Input value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} /></div>
            <div className="sm:col-span-2"><Label>وصف المطعم</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="sm:col-span-2">
              <Label>نوع المطبخ</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {cuisineOptions.map(c => (
                  <Badge key={c} variant={form.cuisine_type.includes(c) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => toggleCuisine(c)}>{c}</Badge>
                ))}
              </div>
            </div>
            <div><Label>رقم الهاتف</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div><Label>نسبة العمولة %</Label><Input type="number" value={form.commission_rate} onChange={e => setForm({...form, commission_rate: Number(e.target.value)})} /></div>
            <div><Label>رسوم التوصيل</Label><Input type="number" value={form.delivery_fee} onChange={e => setForm({...form, delivery_fee: Number(e.target.value)})} /></div>
            <div><Label>الحد الأدنى للطلب</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: Number(e.target.value)})} /></div>
            <div><Label>وقت التوصيل (دقائق)</Label><Input type="number" value={form.estimated_delivery_time} onChange={e => setForm({...form, estimated_delivery_time: Number(e.target.value)})} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_featured} onCheckedChange={v => setForm({...form, is_featured: v})} />
              <Label>مطعم مميز</Label>
            </div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editItem ? "تحديث" : "إضافة"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryRestaurants;
