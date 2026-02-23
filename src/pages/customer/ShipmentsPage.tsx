import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Package, ArrowRight, Truck, User, Phone, MapPin, FileText, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSuppliers, createShipmentRequest } from "@/lib/customerApi";

const ShipmentsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    shipment_type: "door_to_door",
    pickup_address: "",
    delivery_address: "",
    recipient_name: "",
    recipient_phone: "",
    item_description: "",
    item_weight: "",
    item_dimensions: "",
    payment_method: "cash",
  });

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (!form.pickup_address || !form.delivery_address || !form.recipient_name || !form.recipient_phone) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await createShipmentRequest({
        customer_id: user.id,
        supplier_id: selectedSupplier.user_id,
        shipment_type: form.shipment_type,
        pickup_address: form.pickup_address,
        delivery_address: form.delivery_address,
        recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone,
        item_description: form.item_description,
        item_weight: form.item_weight ? Number(form.item_weight) : undefined,
        item_dimensions: form.item_dimensions || undefined,
        payment_method: form.payment_method,
      });
      toast({ title: "تم إرسال طلب الشحن بنجاح!", description: "سيتم مراجعته وتسعيره قريباً." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "select") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container mx-auto px-4 pt-24 pb-12">
          <h1 className="text-3xl font-bold text-foreground mb-2">إرسال شحنة</h1>
          <p className="text-muted-foreground mb-8">اختر شركة الشحن المناسبة</p>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 h-32" />
                </Card>
              ))}
            </div>
          ) : suppliers && suppliers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliers.map((supplier) => (
                <Card
                  key={supplier.user_id}
                  className="hover:shadow-lg transition-shadow cursor-pointer hover:border-primary"
                  onClick={() => {
                    setSelectedSupplier(supplier);
                    setStep("form");
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{supplier.full_name}</h3>
                        {supplier.city && <p className="text-sm text-muted-foreground">{supplier.city}</p>}
                      </div>
                    </div>
                    {supplier.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {supplier.phone}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد شركات شحن متاحة حالياً</p>
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
          <ArrowRight className="w-4 h-4" />
          العودة لاختيار المورد
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              طلب شحنة جديدة - {selectedSupplier?.full_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>نوع الشحن</Label>
              <Select value={form.shipment_type} onValueChange={(v) => setForm({ ...form, shipment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="door_to_door">من الباب إلى الباب</SelectItem>
                  <SelectItem value="office_to_office">من المكتب إلى المكتب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> عنوان الاستلام *</Label>
              <Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} placeholder="أدخل عنوان الاستلام" />
            </div>

            <div>
              <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> عنوان التسليم *</Label>
              <Input value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} placeholder="أدخل عنوان التسليم" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><User className="w-3 h-3" /> اسم المستلم *</Label>
                <Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
              </div>
              <div>
                <Label className="flex items-center gap-1"><Phone className="w-3 h-3" /> هاتف المستلم *</Label>
                <Input value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1"><FileText className="w-3 h-3" /> وصف الشحنة</Label>
              <Textarea value={form.item_description} onChange={(e) => setForm({ ...form, item_description: e.target.value })} placeholder="وصف الأغراض المراد شحنها" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1"><Weight className="w-3 h-3" /> الوزن (كجم)</Label>
                <Input type="number" value={form.item_weight} onChange={(e) => setForm({ ...form, item_weight: e.target.value })} />
              </div>
              <div>
                <Label>الأبعاد</Label>
                <Input value={form.item_dimensions} onChange={(e) => setForm({ ...form, item_dimensions: e.target.value })} placeholder="مثال: 30x20x10 سم" />
              </div>
            </div>

            <div>
              <Label>طريقة الدفع</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
              {submitting ? "جاري الإرسال..." : "إرسال طلب الشحن"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShipmentsPage;
