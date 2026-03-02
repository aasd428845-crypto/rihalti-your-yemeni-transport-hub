import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTripById, createBooking } from "@/lib/customerApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/landing/Header";
import BackButton from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Bus, MapPin, Calendar, CreditCard, Phone, User, Mail, Minus, Plus } from "lucide-react";

const dayLabels: Record<string, string> = {
  saturday: "السبت", sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء",
  wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة",
};

const CheckoutPage = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => fetchTripById(tripId!),
    enabled: !!tripId,
  });

  const [seatCount, setSeatCount] = useState(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user]);

  const totalAmount = trip ? trip.price * seatCount : 0;

  const handleSubmit = async () => {
    if (!user || !trip) return;
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (!agreedToPolicy) {
      toast({ title: "يرجى الموافقة على سياسة الخصوصية", variant: "destructive" });
      return;
    }
    if (seatCount > trip.available_seats) {
      toast({ title: "عدد المقاعد المطلوبة أكبر من المتاح", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({
        trip_id: trip.id,
        customer_id: user.id,
        seat_count: seatCount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
      });
      toast({ title: "تم الحجز بنجاح! 🎉", description: "سيتم إرسال تفاصيل الحجز إليك." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ في الحجز", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-muted-foreground">الرحلة غير موجودة</p>
        </div>
      </div>
    );
  }

  const daysText = trip.departure_days?.map((d: string) => dayLabels[d] || d).join(" • ") || "";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <BackButton fallback={`/trips/${tripId}`} />

        <h1 className="text-2xl font-bold text-foreground mb-6">إتمام الحجز</h1>

        {/* Trip Summary */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                {trip.image_url ? (
                  <img src={trip.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Bus className="w-8 h-8 text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  {trip.from_city} – {trip.to_city}
                </h3>
                {trip.bus_company && <p className="text-sm text-muted-foreground">{trip.bus_company}</p>}
                {daysText && <p className="text-sm text-muted-foreground"><Calendar className="w-3 h-3 inline ml-1" />{daysText}</p>}
                <p className="text-primary font-bold text-lg">{trip.price.toLocaleString()} ر.ي <span className="text-sm font-normal text-muted-foreground">/ للراكب</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card className="mb-6">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-bold text-foreground">بيانات الراكب</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>الاسم الكامل *</Label>
                <div className="relative mt-1">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="أدخل اسمك" className="pr-10" required />
                </div>
              </div>
              <div>
                <Label>رقم الهاتف *</Label>
                <div className="relative mt-1">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+967 7XX XXX XXX" className="pr-10" dir="ltr" required />
                </div>
              </div>
            </div>
            <div>
              <Label>البريد الإلكتروني (اختياري)</Label>
              <div className="relative mt-1">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className="pr-10" dir="ltr" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seat Count */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h3 className="font-bold text-foreground mb-3">عدد المقاعد</h3>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => setSeatCount(Math.max(1, seatCount - 1))} disabled={seatCount <= 1}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-2xl font-bold text-foreground w-12 text-center">{seatCount}</span>
              <Button variant="outline" size="icon" onClick={() => setSeatCount(Math.min(trip.available_seats, seatCount + 1))} disabled={seatCount >= trip.available_seats}>
                <Plus className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">({trip.available_seats} مقعد متاح)</span>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-accent">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">الإجمالي</span>
                <span className="text-xl font-bold text-primary">{totalAmount.toLocaleString()} ر.ي</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="mb-6">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4" /> طريقة الدفع</h3>
            {[
              { value: "cash", label: "نقداً عند الصعود", desc: "الدفع نقداً للسائق" },
              { value: "bank_transfer", label: "تحويل بنكي", desc: "حوالة إلى حساب المنصة" },
              { value: "jawali", label: "جوالي", desc: "الدفع عبر جوالي الكريمي" },
            ].map((m) => (
              <label key={m.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === m.value ? "border-primary bg-accent" : "border-border hover:border-primary/50"}`}>
                <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value} onChange={() => setPaymentMethod(m.value)} className="accent-primary" />
                <div>
                  <p className="font-medium text-foreground">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            ))}
          </CardContent>
        </Card>

        {/* Privacy Policy */}
        <div className="flex items-start gap-2 mb-6">
          <Checkbox checked={agreedToPolicy} onCheckedChange={(c) => setAgreedToPolicy(!!c)} id="policy" />
          <label htmlFor="policy" className="text-sm text-muted-foreground cursor-pointer">
            أوافق على <a href="#" className="text-primary hover:underline">سياسة الخصوصية</a> و<a href="#" className="text-primary hover:underline">شروط الاستخدام</a>
          </label>
        </div>

        {/* Submit */}
        <Button
          className="w-full h-12 bg-hero-gradient text-primary-foreground font-bold text-lg hover:opacity-90"
          onClick={handleSubmit}
          disabled={submitting || !agreedToPolicy}
        >
          {submitting ? "جاري الحجز..." : `تأكيد الحجز • ${totalAmount.toLocaleString()} ر.ي`}
        </Button>
      </div>
    </div>
  );
};

export default CheckoutPage;
