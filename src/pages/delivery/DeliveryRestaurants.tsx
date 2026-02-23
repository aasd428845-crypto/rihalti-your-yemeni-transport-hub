import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Store, Edit, Trash2, Search } from "lucide-react";
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import type { Restaurant } from "@/types/delivery.types";

const DeliveryRestaurants = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Restaurant | null>(null);
  const [form, setForm] = useState({ name_ar: "", name_en: "", phone: "", address: "", commission_rate: 0 });

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
    if (!user || !form.name_ar.trim()) return;
    try {
      if (editItem) {
        await updateRestaurant(editItem.id, form);
        toast({ title: "تم التحديث بنجاح" });
      } else {
        await createRestaurant({ ...form, delivery_company_id: user.id });
        toast({ title: "تمت إضافة المطعم بنجاح" });
      }
      setShowAdd(false); setEditItem(null);
      setForm({ name_ar: "", name_en: "", phone: "", address: "", commission_rate: 0 });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRestaurant(id);
      toast({ title: "تم حذف المطعم" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = (r: Restaurant) => {
    setEditItem(r);
    setForm({ name_ar: r.name_ar, name_en: r.name_en || "", phone: r.phone || "", address: r.address || "", commission_rate: r.commission_rate });
    setShowAdd(true);
  };

  const filtered = restaurants.filter(r => r.name_ar.includes(search) || r.phone?.includes(search));

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">إدارة المطاعم</h2>
        <Button onClick={() => { setEditItem(null); setForm({ name_ar: "", name_en: "", phone: "", address: "", commission_rate: 0 }); setShowAdd(true); }}>
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
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{r.name_ar}</h3>
                  </div>
                  <Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "نشط" : "معطل"}</Badge>
                </div>
                {r.phone && <p className="text-sm text-muted-foreground">📞 {r.phone}</p>}
                {r.address && <p className="text-sm text-muted-foreground">📍 {r.address}</p>}
                <p className="text-sm text-muted-foreground">العمولة: {r.commission_rate}%</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Edit className="w-3 h-3 ml-1" /> تعديل</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3 ml-1" /> حذف</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={v => { setShowAdd(v); if (!v) setEditItem(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "تعديل مطعم" : "إضافة مطعم جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم بالعربية *</Label><Input value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} /></div>
            <div><Label>الاسم بالإنجليزية</Label><Input value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} /></div>
            <div><Label>رقم الهاتف</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <div><Label>نسبة العمولة %</Label><Input type="number" value={form.commission_rate} onChange={e => setForm({...form, commission_rate: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editItem ? "تحديث" : "إضافة"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryRestaurants;
