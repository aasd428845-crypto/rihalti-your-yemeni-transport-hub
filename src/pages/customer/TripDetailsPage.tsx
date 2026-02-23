import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, Users, Star, Bus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTripById, createBooking } from "@/lib/customerApi";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const TripDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [seatCount, setSeatCount] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [booking, setBooking] = useState(false);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => fetchTripById(id!),
    enabled: !!id,
  });

  const handleBook = async () => {
    if (!user) {
      toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!trip) return;

    setBooking(true);
    try {
      await createBooking({
        customer_id: user.id,
        trip_id: trip.id,
        seat_count: seatCount,
        total_amount: trip.price * seatCount,
        payment_method: paymentMethod,
      });
      toast({ title: "تم الحجز بنجاح!", description: "يمكنك متابعة حجزك من صفحة السجل." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ في الحجز", description: err.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">الرحلة غير موجودة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Bus className="w-6 h-6 text-primary" />
              تفاصيل الرحلة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 text-lg">
              <span className="font-bold text-primary">{trip.from_city}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-bold text-primary">{trip.to_city}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(trip.departure_time), "dd MMMM yyyy - HH:mm", { locale: ar })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{trip.available_seats} مقاعد متاحة</span>
              </div>
              {trip.bus_company && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <span>{trip.bus_company}</span>
                </div>
              )}
              {trip.bus_number && (
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-muted-foreground" />
                  <span>باص رقم: {trip.bus_number}</span>
                </div>
              )}
            </div>

            {trip.notes && (
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{trip.notes}</p>
            )}

            <div className="text-3xl font-bold text-primary">{trip.price} ر.ي / مقعد</div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle>حجز المقاعد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>عدد المقاعد</Label>
              <Input
                type="number"
                min={1}
                max={trip.available_seats}
                value={seatCount}
                onChange={(e) => setSeatCount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="direct_to_supplier">دفع مباشر للمورد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>سعر المقعد</span>
                <span>{trip.price} ر.ي</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>عدد المقاعد</span>
                <span>{seatCount}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-lg">
                <span>الإجمالي</span>
                <span className="text-primary">{trip.price * seatCount} ر.ي</span>
              </div>
            </div>

            <Button
              onClick={handleBook}
              disabled={booking || seatCount < 1 || seatCount > trip.available_seats}
              className="w-full"
              size="lg"
            >
              {booking ? "جاري الحجز..." : "تأكيد الحجز"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TripDetailsPage;
