import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupplierTrips, createTrip, updateTrip, deleteTrip, getRegions, getTripTypes } from "@/lib/supplierApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Copy, Bus, MapPin, Calendar, Users } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { amenitiesList } from "@/types/supplier.types";
import type { Region, TripType } from "@/types/supplier.types";

const SupplierTrips = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [tripTypes, setTripTypes] = useState<TripType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTrip, setEditTrip] = useState<any>(null);

  const [form, setForm] = useState({
    type_id: "",
    from_city: "",
    to_city: "",
    from_region_id: "",
    to_region_id: "",
    departure_time: "",
    period: "morning",
    price: "",
    available_seats: "",
    bus_company: "",
    bus_number: "",
    amenities: [] as string[],
    notes: "",
    is_offer: false,
    offer_type: "percentage",
    offer_value: "",
    offer_until: "",
  });

  const loadData = async () => {
    if (!user?.id) return;
    const [tripsRes, regionsRes, typesRes] = await Promise.all([
      getSupplierTrips(user.id),
      getRegions(),
      getTripTypes(),
    ]);
    setTrips(tripsRes.data || []);
    setRegions(regionsRes.data || []);
    setTripTypes(typesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const resetForm = () => {
    setForm({
      type_id: "", from_city: "", to_city: "", from_region_id: "", to_region_id: "",
      departure_time: "", period: "morning", price: "", available_seats: "",
      bus_company: "", bus_number: "", amenities: [], notes: "",
      is_offer: false, offer_type: "percentage", offer_value: "", offer_until: "",
    });
    setEditTrip(null);
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    const fromRegion = regions.find(r => r.id === Number(form.from_region_id));
    const toRegion = regions.find(r => r.id === Number(form.to_region_id));

    const tripData: any = {
      supplier_id: user.id,
      type_id: Number(form.type_id) || null,
      from_city: fromRegion?.name_ar || form.from_city,
      to_city: toRegion?.name_ar || form.to_city,
      from_region_id: Number(form.from_region_id) || null,
      to_region_id: Number(form.to_region_id) || null,
      departure_time: form.departure_time,
      period: form.period,
      price: Number(form.price),
      available_seats: Number(form.available_seats),
      bus_company: form.bus_company || null,
      bus_number: form.bus_number || null,
      amenities: form.amenities,
      notes: form.notes || null,
      is_offer: form.is_offer,
      offer_type: form.is_offer ? form.offer_type : null,
      offer_value: form.is_offer ? Number(form.offer_value) : null,
      offer_until: form.is_offer && form.offer_until ? form.offer_until : null,
      status: "pending",
    };

    let result;
    if (editTrip) {
      result = await updateTrip(editTrip.id, tripData);
    } else {
      result = await createTrip(tripData);
    }

    if (result.error) {
      toast({ title: "خطأ", description: result.error.message, variant: "destructive" });
    } else {
      toast({ title: editTrip ? "تم تحديث الرحلة" : "تم إنشاء الرحلة بنجاح" });
      setShowForm(false);
      resetForm();
      loadData();
    }
  };

  const handleEdit = (trip: any) => {
    setEditTrip(trip);
    setForm({
      type_id: trip.type_id?.toString() || "",
      from_city: trip.from_city || "",
      to_city: trip.to_city || "",
      from_region_id: trip.from_region_id?.toString() || "",
      to_region_id: trip.to_region_id?.toString() || "",
      departure_time: trip.departure_time?.slice(0, 16) || "",
      period: trip.period || "morning",
      price: trip.price?.toString() || "",
      available_seats: trip.available_seats?.toString() || "",
      bus_company: trip.bus_company || "",
      bus_number: trip.bus_number || "",
      amenities: trip.amenities || [],
      notes: trip.notes || "",
      is_offer: trip.is_offer || false,
      offer_type: trip.offer_type || "percentage",
      offer_value: trip.offer_value?.toString() || "",
      offer_until: trip.offer_until?.slice(0, 16) || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (tripId: string) => {
    if (!confirm("هل تريد حذف هذه الرحلة؟")) return;
    const { error } = await deleteTrip(tripId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حذف الرحلة" });
      loadData();
    }
  };

  const copyLink = (tripId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/trip/${tripId}`);
    toast({ title: "تم نسخ الرابط" });
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">إدارة الرحلات</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> رحلة جديدة
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد رحلات حتى الآن. أنشئ رحلتك الأولى!</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <Card key={trip.id}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{trip.from_city} → {trip.to_city}</span>
                      <StatusBadge status={trip.status} />
                      {trip.is_offer && <span className="bg-secondary/20 text-secondary-foreground text-xs px-2 py-0.5 rounded-full">عرض</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(trip.departure_time).toLocaleDateString("ar")}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{trip.available_seats} مقعد</span>
                      <span className="flex items-center gap-1"><Bus className="w-3 h-3" />{trip.price?.toLocaleString()} ر.ي</span>
                      {trip.bus_company && <span>{trip.bus_company}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => copyLink(trip.id)}><Copy className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(trip)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(trip.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editTrip ? "تعديل الرحلة" : "إنشاء رحلة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>نوع الرحلة</Label>
                <Select value={form.type_id} onValueChange={(v) => setForm({ ...form, type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>{tripTypes.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفترة</Label>
                <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">صباحاً</SelectItem>
                    <SelectItem value="evening">مساءً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>من</Label>
                <Select value={form.from_region_id} onValueChange={(v) => setForm({ ...form, from_region_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                  <SelectContent>{regions.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>إلى</Label>
                <Select value={form.to_region_id} onValueChange={(v) => setForm({ ...form, to_region_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                  <SelectContent>{regions.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>تاريخ ووقت الانطلاق</Label><Input type="datetime-local" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} /></div>
              <div><Label>السعر (ر.ي)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>عدد المقاعد</Label><Input type="number" value={form.available_seats} onChange={(e) => setForm({ ...form, available_seats: e.target.value })} /></div>
              <div><Label>شركة النقل</Label><Input value={form.bus_company} onChange={(e) => setForm({ ...form, bus_company: e.target.value })} /></div>
              <div><Label>رقم الباص</Label><Input value={form.bus_number} onChange={(e) => setForm({ ...form, bus_number: e.target.value })} /></div>
            </div>

            <div>
              <Label>وسائل الراحة</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {amenitiesList.map((a) => (
                  <label key={a.id} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={form.amenities.includes(a.id)}
                      onCheckedChange={(checked) => {
                        setForm({
                          ...form,
                          amenities: checked ? [...form.amenities, a.id] : form.amenities.filter((x) => x !== a.id),
                        });
                      }}
                    />
                    {a.label}
                  </label>
                ))}
              </div>
            </div>

            <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

            <div className="border rounded-lg p-4 space-y-3">
              <label className="flex items-center gap-2">
                <Checkbox checked={form.is_offer} onCheckedChange={(c) => setForm({ ...form, is_offer: !!c })} />
                <span className="font-medium">عرض خاص</span>
              </label>
              {form.is_offer && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={form.offer_type} onValueChange={(v) => setForm({ ...form, offer_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة مئوية</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="قيمة الخصم" value={form.offer_value} onChange={(e) => setForm({ ...form, offer_value: e.target.value })} />
                  <Input type="datetime-local" value={form.offer_until} onChange={(e) => setForm({ ...form, offer_until: e.target.value })} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSubmit}>{editTrip ? "تحديث" : "إنشاء"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierTrips;
