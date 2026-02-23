import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bike, ArrowRight, Plus, Trash2, Store, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchDeliveryCompanies, fetchRestaurantsByCompany, createDeliveryOrder } from "@/lib/customerApi";

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

  const [customerInfo, setCustomerInfo] = useState({
    name: profile?.full_name || "",
    phone: profile?.phone || "",
    address: "",
    payment_method: "cash",
    notes: "",
  });

  const { data: companies, isLoading } = useQuery({
    queryKey: ["delivery-companies"],
    queryFn: fetchDeliveryCompanies,
  });

  const { data: restaurants } = useQuery({
    queryKey: ["restaurants", selectedCompany?.user_id],
    queryFn: () => fetchRestaurantsByCompany(selectedCompany.user_id),
    enabled: !!selectedCompany && orderType === "restaurant",
  });

  const addItem = () => setItems([...items, { name: "", quantity: 1, price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = 500;
  const total = subtotal + deliveryFee;

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address || items.some((i) => !i.name)) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await createDeliveryOrder({
        customer_id: user.id,
        delivery_company_id: selectedCompany.user_id,
        restaurant_id: selectedRestaurant || undefined,
        order_type: orderType,
        items,
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        customer_address: customerInfo.address,
        payment_method: customerInfo.payment_method,
        delivery_fee: deliveryFee,
        notes: customerInfo.notes || undefined,
      });
      toast({ title: "تم إنشاء الطلب بنجاح!" });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "company") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container mx-auto px-4 pt-24 pb-12">
          <h1 className="text-3xl font-bold text-foreground mb-2">طلب توصيل</h1>
          <p className="text-muted-foreground mb-8">اختر شركة التوصيل</p>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse"><CardContent className="p-6 h-32" /></Card>
              ))}
            </div>
          ) : companies && companies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((c) => (
                <Card key={c.user_id} className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary" onClick={() => { setSelectedCompany(c); setStep("form"); }}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bike className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{c.full_name}</h3>
                        {c.city && <p className="text-sm text-muted-foreground">{c.city}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Bike className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد شركات توصيل متاحة</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <Button variant="ghost" onClick={() => setStep("company")} className="mb-6 gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-primary" />
              طلب توصيل جديد - {selectedCompany?.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>نوع الطلب</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">مطعم</SelectItem>
                  <SelectItem value="pharmacy">صيدلية</SelectItem>
                  <SelectItem value="supermarket">سوبرماركت</SelectItem>
                  <SelectItem value="general">عام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {orderType === "restaurant" && restaurants && restaurants.length > 0 && (
              <div>
                <Label className="flex items-center gap-1"><Store className="w-3 h-3" /> المطعم</Label>
                <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                  <SelectTrigger><SelectValue placeholder="اختر المطعم" /></SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Items */}
            <div>
              <Label>العناصر</Label>
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input placeholder="اسم العنصر" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} className="flex-1" />
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="w-20" placeholder="الكمية" />
                  <Input type="number" min={0} value={item.price} onChange={(e) => updateItem(idx, "price", Number(e.target.value))} className="w-24" placeholder="السعر" />
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem} className="mt-2 gap-1">
                <Plus className="w-3 h-3" /> إضافة عنصر
              </Button>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><User className="w-3 h-3" /> الاسم *</Label>
                <Input value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> الهاتف *</Label>
                <Input value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> عنوان التوصيل *</Label>
              <Input value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} />
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea value={customerInfo.notes} onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })} />
            </div>

            <div>
              <Label>طريقة الدفع</Label>
              <Select value={customerInfo.payment_method} onValueChange={(v) => setCustomerInfo({ ...customerInfo, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between"><span>المجموع الفرعي</span><span>{subtotal} ر.ي</span></div>
              <div className="flex justify-between"><span>رسوم التوصيل</span><span>{deliveryFee} ر.ي</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                <span>الإجمالي</span><span className="text-primary">{total} ر.ي</span>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
              {submitting ? "جاري الإرسال..." : "تأكيد الطلب"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveriesPage;
