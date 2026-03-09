import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bike, ArrowRight, Plus, Trash2, Store, MapPin, Phone, User, Star, Search, Globe, ShoppingBag, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDeliveryCompanies, fetchRestaurantsByCompany, createDeliveryOrder } from "@/lib/customerApi";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "@/components/common/BackButton";
import AddressSelector from "@/components/addresses/AddressSelector";
import type { SelectedAddress } from "@/components/addresses/AddressSelector";

const DeliveriesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<"company" | "form">("company");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [orderType, setOrderType] = useState("restaurant");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState([{ name: "", quantity: 1, price: 0 }]);
  const [searchTerm, setSearchTerm] = useState("");
  const [workingAreas, setWorkingAreas] = useState<Record<string, string[]>>({});
  const [deliveryLat, setDeliveryLat] = useState(0);
  const [deliveryLng, setDeliveryLng] = useState(0);

  const [customerInfo, setCustomerInfo] = useState({
    name: profile?.full_name || "", phone: profile?.phone || "",
    address: "", payment_method: "cash", notes: "",
  });

  const { data: companies, isLoading } = useQuery({ queryKey: ["delivery-companies"], queryFn: fetchDeliveryCompanies });
  const { data: restaurants } = useQuery({
    queryKey: ["restaurants", selectedCompany?.user_id],
    queryFn: () => fetchRestaurantsByCompany(selectedCompany.user_id),
    enabled: !!selectedCompany && orderType === "restaurant",
  });

  useEffect(() => {
    if (!companies || companies.length === 0) return;
    const fetchAreas = async () => {
      const ids = companies.map((c: any) => c.user_id);
      const { data: areas } = await supabase.from("supplier_working_areas").select("supplier_id, region_id").in("supplier_id", ids);
      if (!areas || areas.length === 0) return;
      const regionIds = [...new Set(areas.map(a => a.region_id))];
      const { data: regions } = await supabase.from("regions").select("id, name_ar").in("id", regionIds);
      const regionMap = new Map((regions || []).map(r => [r.id, r.name_ar]));
      const map: Record<string, string[]> = {};
      for (const a of areas) { if (!map[a.supplier_id]) map[a.supplier_id] = []; const n = regionMap.get(a.region_id); if (n) map[a.supplier_id].push(n); }
      setWorkingAreas(map);
    };
    fetchAreas();
  }, [companies]);

  const filtered = (companies || []).filter((c: any) =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = () => setItems([...items, { name: "", quantity: 1, price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => { const u = [...items]; (u[idx] as any)[field] = value; setItems(u); };
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = 500;
  const total = subtotal + deliveryFee;

  const handleAddressSelect = (addr: SelectedAddress | null) => {
    if (!addr) return;
    setCustomerInfo(prev => ({
      ...prev,
      address: addr.full_address,
      phone: addr.phone || prev.phone,
    }));
    setDeliveryLat(addr.latitude || 0);
    setDeliveryLng(addr.longitude || 0);
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" }); navigate("/login"); return; }
    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address || items.some(i => !i.name)) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      await createDeliveryOrder({
        customer_id: user.id, delivery_company_id: selectedCompany.user_id,
        restaurant_id: selectedRestaurant || undefined, order_type: orderType, items,
        customer_name: customerInfo.name, customer_phone: customerInfo.phone,
        customer_address: customerInfo.address, payment_method: customerInfo.payment_method,
        delivery_fee: deliveryFee, notes: customerInfo.notes || undefined,
        delivery_lat: deliveryLat || undefined, delivery_lng: deliveryLng || undefined,
      });
      toast({ title: "تم إنشاء الطلب بنجاح!" });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (step === "company") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container mx-auto px-4 pt-24 pb-12">
          <BackButton />
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2">خدمة التوصيل</h1>
            <p className="text-muted-foreground max-w-md mx-auto">اختر شركة التوصيل واطلب ما تريد من مطاعم ومتاجر بسهولة</p>
          </div>

          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ابحث عن شركة توصيل..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-40" /></Card>)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((c: any) => {
                const areas = workingAreas[c.user_id] || [];
                return (
                  <Card key={c.user_id} className="hover:shadow-lg transition-all cursor-pointer hover:border-primary group" onClick={() => { setSelectedCompany(c); setStep("form"); }}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Bike className="w-7 h-7 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{c.full_name}</h3>
                          {c.city && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{c.city}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mb-3">
                        {[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= 4 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />)}
                        <span className="text-xs text-muted-foreground mr-1">4.0</span>
                      </div>
                      {areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Globe className="w-3 h-3 text-muted-foreground mt-1" />
                          {areas.slice(0, 3).map(a => <span key={a} className="text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">{a}</span>)}
                          {areas.length > 3 && <span className="text-xs text-muted-foreground">+{areas.length - 3}</span>}
                        </div>
                      )}
                      {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                      <Button variant="outline" size="sm" className="w-full mt-4 gap-1"><ShoppingBag className="w-3 h-3" />طلب توصيل</Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Bike className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg font-medium">لا توجد شركات توصيل متاحة حالياً</p>
              <p className="text-sm text-muted-foreground mt-1">هل لديك شركة توصيل؟ تواصل معنا للانضمام</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <Button variant="ghost" onClick={() => setStep("company")} className="mb-6 gap-2"><ArrowRight className="w-4 h-4" />العودة</Button>
        <Card className="mb-6">
          <CardHeader><CardTitle className="flex items-center gap-2"><Bike className="w-5 h-5 text-primary" />طلب توصيل جديد - {selectedCompany?.full_name}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>نوع الطلب</Label><Select value={orderType} onValueChange={setOrderType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="restaurant">مطعم</SelectItem><SelectItem value="pharmacy">صيدلية</SelectItem><SelectItem value="supermarket">سوبرماركت</SelectItem><SelectItem value="general">عام</SelectItem></SelectContent></Select></div>
            {orderType === "restaurant" && restaurants && restaurants.length > 0 && (
              <div><Label className="flex items-center gap-1"><Store className="w-3 h-3" /> المطعم</Label><Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}><SelectTrigger><SelectValue placeholder="اختر المطعم" /></SelectTrigger><SelectContent>{restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name_ar}</SelectItem>)}</SelectContent></Select></div>
            )}
            <div><Label>العناصر</Label>{items.map((item, idx) => (<div key={idx} className="flex gap-2 mt-2"><Input placeholder="اسم العنصر" value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} className="flex-1" /><Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, "quantity", Number(e.target.value))} className="w-20" /><Input type="number" min={0} value={item.price} onChange={e => updateItem(idx, "price", Number(e.target.value))} className="w-24" />{items.length > 1 && <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}</div>))}<Button variant="outline" size="sm" onClick={addItem} className="mt-2 gap-1"><Plus className="w-3 h-3" /> إضافة عنصر</Button></div>
            <div className="grid grid-cols-2 gap-4"><div><Label className="flex items-center gap-1"><User className="w-3 h-3" /> الاسم *</Label><Input value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} /></div><div><Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> الهاتف *</Label><Input value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} /></div></div>
            
            {/* Address selector */}
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <AddressSelector
                label="اختر عنوان التوصيل من المحفوظ"
                onSelect={handleAddressSelect}
                showUseMyLocation
                onUseMyLocation={(lat, lng) => { setDeliveryLat(lat); setDeliveryLng(lng); }}
              />
              <div>
                <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> عنوان التوصيل *</Label>
                <Input value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} placeholder="أو أدخل العنوان يدوياً" />
              </div>
              {deliveryLat !== 0 && (
                <p className="text-xs text-green-600">📍 إحداثيات: {deliveryLat.toFixed(4)}, {deliveryLng.toFixed(4)}</p>
              )}
            </div>

            <div><Label>ملاحظات</Label><Textarea value={customerInfo.notes} onChange={e => setCustomerInfo({...customerInfo, notes: e.target.value})} /></div>
            <div><Label>طريقة الدفع</Label><Select value={customerInfo.payment_method} onValueChange={v => setCustomerInfo({...customerInfo, payment_method: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">نقداً</SelectItem><SelectItem value="card">بطاقة</SelectItem></SelectContent></Select></div>
            <div className="bg-muted p-4 rounded-lg space-y-2"><div className="flex justify-between"><span className="text-foreground">المجموع الفرعي</span><span className="text-foreground">{subtotal} ر.ي</span></div><div className="flex justify-between"><span className="text-foreground">رسوم التوصيل</span><span className="text-foreground">{deliveryFee} ر.ي</span></div><div className="border-t border-border pt-2 flex justify-between font-bold text-lg"><span className="text-foreground">الإجمالي</span><span className="text-primary">{total} ر.ي</span></div></div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">{submitting ? "جاري الإرسال..." : "تأكيد الطلب"}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveriesPage;
