import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Clock, Users, Car, ArrowLeft, Send, LocateFixed } from "lucide-react";
import NearbyDriversList from "@/components/customer/NearbyDriversList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createRideRequest } from "@/lib/rideApi";
import BackButton from "@/components/common/BackButton";
import AddressSelector from "@/components/addresses/AddressSelector";
import type { SelectedAddress } from "@/components/addresses/AddressSelector";

const RideRequestPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fromCity: "",
    toCity: "",
    fromAddress: "",
    toAddress: "",
    pickupLat: 0,
    pickupLng: 0,
    dropoffLat: 0,
    dropoffLng: 0,
    rideType: "one_way",
    waitingTime: 30,
    passengerCount: 1,
    notes: "",
    paymentMethod: "cash",
  });

  const cities = [
    "صنعاء", "عدن", "تعز", "الحديدة", "إب", "ذمار", "المكلا", "سيئون",
    "مأرب", "حجة", "صعدة", "عمران", "البيضاء", "لحج", "أبين", "شبوة",
  ];

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "يرجى تسجيل الدخول", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!form.fromCity || !form.toCity) {
      toast({ title: "يرجى تحديد نقطة الانطلاق والوجهة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const data = await createRideRequest({
        customerId: user.id,
        fromCity: form.fromCity,
        toCity: form.toCity,
        fromAddress: form.fromAddress,
        toAddress: form.toAddress,
        pickupLat: form.pickupLat || undefined,
        pickupLng: form.pickupLng || undefined,
        dropoffLat: form.dropoffLat || undefined,
        dropoffLng: form.dropoffLng || undefined,
        rideType: form.rideType,
        passengerCount: form.passengerCount,
        notes: form.notes || undefined,
        paymentMethod: form.paymentMethod,
      });
      toast({ title: "✅ تم إرسال طلب الأجرة", description: "بانتظار عرض سعر من السائقين" });
      navigate(`/ride/${(data as any).id}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground">طلب أجرة</h1>
            <p className="text-sm text-muted-foreground">حدد وجهتك وسيتواصل معك سائق بعرض سعر</p>
          </div>
        </div>

        {/* Pickup Section */}
        <Card className="mb-4 border-primary/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h3 className="font-semibold text-foreground">نقطة الانطلاق</h3>
            </div>
            <AddressSelector
              label="اختر من عناوينك المحفوظة"
              onSelect={(addr) => {
                if (addr) {
                  setForm(f => ({
                    ...f,
                    fromAddress: addr.full_address,
                    fromCity: addr.city || f.fromCity,
                    pickupLat: addr.latitude || 0,
                    pickupLng: addr.longitude || 0,
                  }));
                }
              }}
              showUseMyLocation
              onUseMyLocation={(lat, lng) => {
                setForm(f => ({ ...f, pickupLat: lat, pickupLng: lng }));
                toast({ title: "✅ تم تحديد موقعك", description: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">المدينة *</Label>
                <select
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                  value={form.fromCity}
                  onChange={e => setForm(f => ({ ...f, fromCity: e.target.value }))}
                >
                  <option value="">اختر المدينة</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">العنوان التفصيلي</Label>
                <Input
                  value={form.fromAddress}
                  onChange={e => setForm(f => ({ ...f, fromAddress: e.target.value }))}
                  placeholder="مثال: شارع الزبيري، بجانب..."
                  className="mt-1"
                />
              </div>
            </div>
            {form.pickupLat !== 0 && (
              <p className="text-xs text-green-600">📍 تم تحديد الموقع: {form.pickupLat.toFixed(4)}, {form.pickupLng.toFixed(4)}</p>
            )}
          </CardContent>
        </Card>

        {/* Dropoff Section */}
        <Card className="mb-4 border-destructive/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <h3 className="font-semibold text-foreground">الوجهة</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">المدينة *</Label>
                <select
                  className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                  value={form.toCity}
                  onChange={e => setForm(f => ({ ...f, toCity: e.target.value }))}
                >
                  <option value="">اختر المدينة</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">العنوان التفصيلي</Label>
                <Input
                  value={form.toAddress}
                  onChange={e => setForm(f => ({ ...f, toAddress: e.target.value }))}
                  placeholder="مثال: حي المطار، بجانب..."
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ride Options */}
        <Card className="mb-4">
          <CardContent className="p-5 space-y-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Car size={18} className="text-primary" />
              خيارات الرحلة
            </h3>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">نوع الرحلة</Label>
              <RadioGroup value={form.rideType} onValueChange={v => setForm(f => ({ ...f, rideType: v }))} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="one_way" id="one_way" />
                  <Label htmlFor="one_way" className="cursor-pointer">ذهاب فقط</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="round_trip" id="round_trip" />
                  <Label htmlFor="round_trip" className="cursor-pointer">ذهاب وعودة</Label>
                </div>
              </RadioGroup>
            </div>

            {form.rideType === "round_trip" && (
              <div>
                <Label className="text-xs text-muted-foreground">مدة الانتظار (بالدقائق)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock size={16} className="text-muted-foreground" />
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={form.waitingTime}
                    onChange={e => setForm(f => ({ ...f, waitingTime: parseInt(e.target.value) || 30 }))}
                    className="w-28"
                  />
                  <span className="text-xs text-muted-foreground">دقيقة</span>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">عدد الركاب</Label>
              <div className="flex items-center gap-2 mt-1">
                <Users size={16} className="text-muted-foreground" />
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={form.passengerCount}
                  onChange={e => setForm(f => ({ ...f, passengerCount: parseInt(e.target.value) || 1 }))}
                  className="w-20"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">طريقة الدفع</Label>
              <select
                className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
                value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="cash">نقداً عند الوصول</option>
                <option value="bank_transfer">تحويل بنكي</option>
              </select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">ملاحظات إضافية</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="أي تعليمات للسائق..."
                className="mt-1"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Nearby Drivers */}
        {form.pickupLat !== 0 && form.fromCity && form.toCity && (
          <div className="mb-4">
            <NearbyDriversList pickupLat={form.pickupLat} pickupLng={form.pickupLng} />
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !form.fromCity || !form.toCity}
          className="w-full h-14 text-lg font-bold gap-3 rounded-xl"
        >
          {submitting ? (
            <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <>
              <Send size={20} />
              إرسال طلب الأجرة
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-3">
          بعد إرسال الطلب، سيتواصل معك سائق بعرض سعر. لن يتم خصم أي مبلغ حتى توافق على السعر.
        </p>
      </div>
    </div>
  );
};

export default RideRequestPage;
