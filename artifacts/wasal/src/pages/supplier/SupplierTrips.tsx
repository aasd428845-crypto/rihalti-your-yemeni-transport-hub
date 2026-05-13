import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupplierTrips, createTrip, updateTrip, deleteTrip, getRegions, getTripTypes } from "@/lib/supplierApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Copy, Bus, MapPin, Calendar, Users, Upload, Image } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    image_url: "",
    departure_days: [] as string[],
    check_in_time: "",
    check_in_location: "",
    luggage_weight: "",
    description: "",
    trip_type: "عادي",
    arrival_time: "",
    capacity: "",
    driver_phone: "",
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

  // Determine trip type slug for region filtering
  const selectedType = tripTypes.find(t => t.id === Number(form.type_id));
  const isLocal = selectedType?.slug === "local";
  const isInternational = selectedType?.slug === "international";
  const isUmrah = selectedType?.slug === "umrah";
  const isHajj = selectedType?.slug === "hajj";

  // Get Yemen ID
  const yemenRegion = regions.find(r => r.name_ar === "اليمن" && r.type === "country");
  const yemenId = yemenRegion?.id;

  // Filter regions for from/to
  const yemeniCities = regions.filter(r => r.parent_id === yemenId && (r.type === "governorate" || r.type === "city"));
  const countries = regions.filter(r => r.type === "country" && r.name_ar !== "اليمن");
  const allCitiesForCountry = (countryId: number) => regions.filter(r => r.parent_id === countryId);

  // From options: always Yemeni cities
  const fromOptions = yemeniCities;

  // To options depend on type
  let toOptions: Region[] = [];
  if (isLocal) {
    toOptions = yemeniCities;
  } else if (isInternational) {
    // Show countries, then when selected show their cities
    toOptions = countries;
  } else if (isUmrah || isHajj) {
    // Pre-fill Saudi cities
    const saRegion = regions.find(r => r.name_ar === "السعودية" && r.type === "country");
    if (saRegion) {
      toOptions = regions.filter(r => r.parent_id === saRegion.id);
    }
  } else {
    toOptions = regions.filter(r => r.type !== "country");
  }

  // For international: selected country sub-cities
  const selectedToRegion = regions.find(r => r.id === Number(form.to_region_id));
  const toSubCities = selectedToRegion?.type === "country" ? allCitiesForCountry(selectedToRegion.id) : [];

  const resetForm = () => {
    setForm({
      type_id: "", from_city: "", to_city: "", from_region_id: "", to_region_id: "",
      departure_time: "", period: "morning", price: "", available_seats: "",
      bus_company: "", bus_number: "", amenities: [], notes: "",
      is_offer: false, offer_type: "percentage", offer_value: "", offer_until: "",
      image_url: "", departure_days: [], check_in_time: "", check_in_location: "",
      luggage_weight: "", description: "", trip_type: "عادي", arrival_time: "",
      capacity: "", driver_phone: "",
    });
    setEditTrip(null);
    setImagePreview(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `supplier-${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("trip-images").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("trip-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: urlData.publicUrl }));
      setImagePreview(urlData.publicUrl);
      toast({ title: "تم رفع الصورة بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    const fromRegion = regions.find(r => r.id === Number(form.from_region_id));
    const toRegion = regions.find(r => r.id === Number(form.to_region_id));

    const tripData: any = {
      supplier_id: user.id,
      type_id: Number(form.type_id) || null,
      from_city: fromRegion?.name_ar || form.from_city,
      to_city: form.to_city || toRegion?.name_ar || "",
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
      image_url: form.image_url || null,
      status: "pending", // Will be overridden below if auto-approve is on
      departure_days: form.departure_days.length > 0 ? form.departure_days : null,
      check_in_time: form.check_in_time || null,
      check_in_location: form.check_in_location || null,
      luggage_weight: form.luggage_weight || null,
      description: form.description || null,
      trip_type: form.trip_type || "عادي",
      arrival_time: form.arrival_time || null,
      capacity: Number(form.capacity) || null,
      driver_phone: form.driver_phone || null,
    };

    // Check auto-approve setting
    if (!editTrip) {
      const { data: settingData } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "auto_approve_trips")
        .maybeSingle();
      if (settingData?.value === "true") {
        tripData.status = "approved";
      }
    }

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
      image_url: trip.image_url || "",
      departure_days: trip.departure_days || [],
      check_in_time: trip.check_in_time || "",
      check_in_location: trip.check_in_location || "",
      luggage_weight: trip.luggage_weight || "",
      description: trip.description || "",
      trip_type: trip.trip_type || "عادي",
      arrival_time: trip.arrival_time || "",
      capacity: trip.capacity?.toString() || "",
      driver_phone: trip.driver_phone || "",
    });
    setImagePreview(trip.image_url || null);
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
    navigator.clipboard.writeText(`${window.location.origin}/trips/${tripId}`);
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
                  <div className="flex gap-3 flex-1">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      {trip.image_url ? (
                        <img src={trip.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Bus className="w-6 h-6 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-semibold">{trip.from_city} → {trip.to_city}</span>
                        <StatusBadge status={trip.status} />
                        {trip.is_offer && <span className="bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-full">عرض</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(trip.departure_time).toLocaleDateString("ar")}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{trip.available_seats} مقعد</span>
                        <span className="flex items-center gap-1 text-primary font-medium">{trip.price?.toLocaleString()} ر.ي</span>
                        {trip.bus_company && <span>{trip.bus_company}</span>}
                      </div>
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
            {/* Trip Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>نوع الرحلة</Label>
                <Select value={form.type_id} onValueChange={(v) => setForm({ ...form, type_id: v, from_region_id: "", to_region_id: "", to_city: "" })}>
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

            {/* From / To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>من (مدينة الانطلاق)</Label>
                <Select value={form.from_region_id} onValueChange={(v) => {
                  const r = regions.find(reg => reg.id === Number(v));
                  setForm({ ...form, from_region_id: v, from_city: r?.name_ar || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                  <SelectContent>
                    {fromOptions.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isInternational ? "إلى (الدولة)" : "إلى"}</Label>
                <Select value={form.to_region_id} onValueChange={(v) => {
                  const r = regions.find(reg => reg.id === Number(v));
                  setForm({ ...form, to_region_id: v, to_city: r?.name_ar || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر الوجهة" /></SelectTrigger>
                  <SelectContent>
                    {toOptions.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sub-city for international */}
            {isInternational && toSubCities.length > 0 && (
              <div>
                <Label>المدينة في {selectedToRegion?.name_ar}</Label>
                <Select value={form.to_city} onValueChange={(v) => setForm({ ...form, to_city: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                  <SelectContent>
                    {toSubCities.map((c) => <SelectItem key={c.id} value={c.name_ar}>{c.name_ar}</SelectItem>)}
                    <SelectItem value="__custom">أخرى (إدخال يدوي)</SelectItem>
                  </SelectContent>
                </Select>
                {form.to_city === "__custom" && (
                  <Input
                    className="mt-2"
                    placeholder="أدخل اسم المدينة"
                    onChange={(e) => setForm({ ...form, to_city: e.target.value })}
                  />
                )}
              </div>
            )}

            {/* Date, Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>تاريخ ووقت الانطلاق</Label><Input type="datetime-local" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} /></div>
              <div><Label>السعر (ر.ي)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            </div>

            {/* Seats, Bus */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label>عدد المقاعد</Label><Input type="number" value={form.available_seats} onChange={(e) => setForm({ ...form, available_seats: e.target.value })} /></div>
              <div><Label>شركة النقل</Label><Input value={form.bus_company} onChange={(e) => setForm({ ...form, bus_company: e.target.value })} /></div>
              <div><Label>رقم الباص</Label><Input value={form.bus_number} onChange={(e) => setForm({ ...form, bus_number: e.target.value })} /></div>
            </div>

            {/* Image Upload */}
            <div>
              <Label>صورة الرحلة</Label>
              <div className="mt-2 flex items-center gap-4">
                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? "جاري الرفع..." : "رفع صورة"}
                </Button>
                {imagePreview && (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* New Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>نوع الرحلة</Label>
                <Select value={form.trip_type} onValueChange={(v) => setForm({ ...form, trip_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="عادي">عادي</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="اقتصادي">اقتصادي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>السعة الكلية</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="عدد المقاعد الكلي" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>وقت الحضور</Label><Input value={form.check_in_time} onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} placeholder="مثال: 4:00 مساءً" /></div>
              <div><Label>مكان الحضور</Label><Input value={form.check_in_location} onChange={(e) => setForm({ ...form, check_in_location: e.target.value })} placeholder="مثال: مكتب الشركة - شارع..." /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>وقت الوصول</Label><Input value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} placeholder="مثال: 8:00 صباحاً" /></div>
              <div><Label>وزن الأمتعة المسموح</Label><Input value={form.luggage_weight} onChange={(e) => setForm({ ...form, luggage_weight: e.target.value })} placeholder="مثال: 25 كجم" /></div>
            </div>

            <div><Label>رقم هاتف السائق</Label><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} placeholder="+967 7XX XXX XXX" dir="ltr" /></div>

            {/* Departure Days */}
            <div>
              <Label>أيام التشغيل</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {[
                  { id: "saturday", label: "السبت" }, { id: "sunday", label: "الأحد" }, { id: "monday", label: "الاثنين" },
                  { id: "tuesday", label: "الثلاثاء" }, { id: "wednesday", label: "الأربعاء" }, { id: "thursday", label: "الخميس" }, { id: "friday", label: "الجمعة" },
                ].map((d) => (
                  <label key={d.id} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={form.departure_days.includes(d.id)} onCheckedChange={(checked) => {
                      setForm({ ...form, departure_days: checked ? [...form.departure_days, d.id] : form.departure_days.filter((x) => x !== d.id) });
                    }} />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            <div><Label>وصف الرحلة</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للرحلة" /></div>

            {/* Amenities */}
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

            {/* Offer */}
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
