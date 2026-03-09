import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Package, ArrowRight, Truck, User, Phone, MapPin, FileText, Weight, Star, Search, Globe, ShoppingBag, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSuppliers, createShipmentRequest } from "@/lib/customerApi";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "@/components/common/BackButton";
import AddressSelector from "@/components/addresses/AddressSelector";
import type { SelectedAddress } from "@/components/addresses/AddressSelector";
import MapPicker from "@/components/maps/MapPicker";

const ShipmentsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workingAreas, setWorkingAreas] = useState<Record<string, string[]>>({});
  const [pickupFromSaved, setPickupFromSaved] = useState(false);

  const [form, setForm] = useState({
    shipment_type: "door_to_door", pickup_address: "", delivery_address: "",
    recipient_name: "", recipient_phone: "", item_description: "",
    item_weight: "", item_dimensions: "", payment_method: "cash",
    pickup_lat: 0, pickup_lng: 0, delivery_lat: 0, delivery_lng: 0,
    pickup_landmark: "", delivery_landmark: "",
  });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

  useEffect(() => {
    if (!suppliers || suppliers.length === 0) return;
    const fetchAreas = async () => {
      const ids = suppliers.map((s: any) => s.user_id);
      const { data: areas } = await supabase.from("supplier_working_areas").select("supplier_id, region_id").in("supplier_id", ids);
      if (!areas || areas.length === 0) return;
      const regionIds = [...new Set(areas.map(a => a.region_id))];
      const { data: regions } = await supabase.from("regions").select("id, name_ar").in("id", regionIds);
      const regionMap = new Map((regions || []).map(r => [r.id, r.name_ar]));
      const map: Record<string, string[]> = {};
      for (const a of areas) { if (!map[a.supplier_id]) map[a.supplier_id] = []; const name = regionMap.get(a.region_id); if (name) map[a.supplier_id].push(name); }
      setWorkingAreas(map);
    };
    fetchAreas();
  }, [suppliers]);

  const filtered = (suppliers || []).filter((s: any) =>
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePickupAddressSelect = (addr: SelectedAddress | null) => {
    if (!addr) return;
    setForm(f => ({
      ...f,
      pickup_address: addr.full_address,
      pickup_lat: addr.latitude || 0,
      pickup_lng: addr.longitude || 0,
      pickup_landmark: addr.landmark || "",
    }));
    setPickupFromSaved(true);
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" }); navigate("/login"); return; }
    if (!form.pickup_address || !form.delivery_address || !form.recipient_name || !form.recipient_phone) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      await createShipmentRequest({
        customer_id: user.id, supplier_id: selectedSupplier.user_id,
        shipment_type: form.shipment_type, pickup_address: form.pickup_address,
        delivery_address: form.delivery_address, recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone, item_description: form.item_description,
        item_weight: form.item_weight ? Number(form.item_weight) : undefined,
        item_dimensions: form.item_dimensions || undefined, payment_method: form.payment_method,
        pickup_lat: form.pickup_lat || undefined, pickup_lng: form.pickup_lng || undefined,
        delivery_lat: form.delivery_lat || undefined, delivery_lng: form.delivery_lng || undefined,
        pickup_landmark: form.pickup_landmark || undefined, delivery_landmark: form.delivery_landmark || undefined,
      });
      toast({ title: "تم إرسال طلب الشحن بنجاح!", description: "سيتم مراجعته وتسعيره قريباً." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (step === "select") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container mx-auto px-4 pt-24 pb-12">
          <BackButton />
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">خدمة الشحن</h1>
            <p className="text-muted-foreground max-w-md mx-auto">اختر شركة الشحن المناسبة لإرسال بضائعك بثقة وأمان إلى أي مكان</p>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ابحث عن شركة شحن أو مدينة..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-40" /></Card>)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((supplier: any) => {
                const areas = workingAreas[supplier.user_id] || [];
                return (
                  <Card key={supplier.user_id} className="hover:shadow-lg transition-all cursor-pointer hover:border-primary group" onClick={() => { setSelectedSupplier(supplier); setStep("form"); }}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        {supplier.logo_url ? (
                          <img src={supplier.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Truck className="w-7 h-7 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{supplier.full_name}</h3>
                          {supplier.city && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.city}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= 4 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />)}
                        <span className="text-xs text-muted-foreground mr-1">4.0</span>
                      </div>
                      {areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Globe className="w-3 h-3 text-muted-foreground mt-1" />
                          {areas.slice(0, 3).map(a => <span key={a} className="text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">{a}</span>)}
                          {areas.length > 3 && <span className="text-xs text-muted-foreground">+{areas.length - 3}</span>}
                        </div>
                      )}
                      {supplier.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</p>}
                      <Button variant="outline" size="sm" className="w-full mt-4 gap-1">
                        <Package className="w-3 h-3" />إرسال شحنة
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg font-medium">لا توجد شركات شحن متاحة حالياً</p>
              <p className="text-sm text-muted-foreground mt-1">يمكنك التواصل معنا لإضافة شركتك</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <Button variant="ghost" onClick={() => setStep("select")} className="mb-6 gap-2">
          <ArrowRight className="w-4 h-4" />العودة لاختيار المورد
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" />طلب شحنة جديدة - {selectedSupplier?.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><Label>نوع الشحن</Label><Select value={form.shipment_type} onValueChange={(v) => setForm({ ...form, shipment_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="door_to_door">من الباب إلى الباب</SelectItem><SelectItem value="office_to_office">من المكتب إلى المكتب</SelectItem></SelectContent></Select></div>

            {/* Pickup Address - with saved addresses */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" /> عنوان الاستلام
              </h4>
              <AddressSelector
                label="اختر من عناوينك المحفوظة"
                onSelect={handlePickupAddressSelect}
                showUseMyLocation
                onUseMyLocation={(lat, lng) => setForm(f => ({ ...f, pickup_lat: lat, pickup_lng: lng }))}
              />
              <div>
                <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> عنوان الاستلام *</Label>
                <Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} placeholder="أدخل عنوان الاستلام أو اختر من القائمة أعلاه" />
              </div>
              <div>
                <Label>أقرب معلم (اختياري)</Label>
                <Input value={form.pickup_landmark} onChange={(e) => setForm({ ...form, pickup_landmark: e.target.value })} placeholder="مثال: بجوار مسجد السلام" />
              </div>
              {form.pickup_lat !== 0 && (
                <p className="text-xs text-green-600">📍 إحداثيات: {form.pickup_lat.toFixed(4)}, {form.pickup_lng.toFixed(4)}</p>
              )}
            </div>

            {/* Delivery Address - recipient */}
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" /> عنوان التسليم (المستلم)
              </h4>
              <div>
                <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> عنوان التسليم *</Label>
                <Input value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} placeholder="أدخل عنوان التسليم" />
              </div>
              <div>
                <Label>أقرب معلم للمستلم (اختياري)</Label>
                <Input value={form.delivery_landmark} onChange={(e) => setForm({ ...form, delivery_landmark: e.target.value })} placeholder="مثال: مقابل البنك المركزي" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">تحديد موقع التسليم على الخريطة (اختياري)</Label>
                <MapPicker
                  lat={form.delivery_lat || undefined}
                  lng={form.delivery_lng || undefined}
                  onLocationSelect={(lat, lng) => setForm(f => ({ ...f, delivery_lat: lat, delivery_lng: lng }))}
                  height="200px"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label className="flex items-center gap-1"><User className="w-3 h-3" /> اسم المستلم *</Label><Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /></div>
              <div><Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> هاتف المستلم *</Label><Input value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} /></div>
            </div>
            <div><Label className="flex items-center gap-1"><FileText className="w-3 h-3" /> وصف الشحنة</Label><Textarea value={form.item_description} onChange={(e) => setForm({ ...form, item_description: e.target.value })} placeholder="وصف الأغراض المراد شحنها" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="flex items-center gap-1"><Weight className="w-3 h-3" /> الوزن (كجم)</Label><Input type="number" value={form.item_weight} onChange={(e) => setForm({ ...form, item_weight: e.target.value })} /></div>
              <div><Label>الأبعاد</Label><Input value={form.item_dimensions} onChange={(e) => setForm({ ...form, item_dimensions: e.target.value })} placeholder="مثال: 30x20x10 سم" /></div>
            </div>
            <div><Label>طريقة الدفع</Label><Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">نقداً</SelectItem><SelectItem value="bank_transfer">تحويل بنكي</SelectItem></SelectContent></Select></div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">{submitting ? "جاري الإرسال..." : "إرسال طلب الشحن"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShipmentsPage;
