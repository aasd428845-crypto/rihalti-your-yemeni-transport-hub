import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, Users, Bus, ArrowRight, Tag, Shield, Wifi, Droplets, Monitor, Plug, Cookie, Bath, Armchair, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchTripById, createBooking, fetchSupplierBankAccounts } from "@/lib/customerApi";
import Header from "@/components/landing/Header";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const amenityIcons: Record<string, { icon: any; label: string }> = {
  ac: { icon: Armchair, label: "تكييف" },
  wifi: { icon: Wifi, label: "واي فاي" },
  screen: { icon: Monitor, label: "شاشات" },
  usb: { icon: Plug, label: "شواحن USB" },
  water: { icon: Droplets, label: "مياه" },
  snacks: { icon: Cookie, label: "وجبات خفيفة" },
  bathroom: { icon: Bath, label: "دورة مياه" },
  legroom: { icon: Armchair, label: "مساحة أرجل واسعة" },
};

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

  const { data: bankAccounts } = useQuery({
    queryKey: ["supplier-banks", trip?.supplier?.user_id],
    queryFn: () => fetchSupplierBankAccounts(trip!.supplier!.user_id),
    enabled: !!trip?.supplier?.user_id && paymentMethod === "direct_to_supplier",
  });

  const finalPrice = trip?.is_offer && trip?.offer_value
    ? trip.offer_type === "percentage"
      ? trip.price * (1 - trip.offer_value / 100)
      : trip.price - trip.offer_value
    : trip?.price || 0;

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
        total_amount: Math.round(finalPrice * seatCount),
        payment_method: paymentMethod,
      });
      toast({ title: "تم الحجز بنجاح! 🎉", description: "يمكنك متابعة حجزك من صفحة السجل." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ في الحجز", description: err.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <div className="flex items-center justify-center pt-32">
          <p className="text-muted-foreground">الرحلة غير موجودة</p>
        </div>
      </div>
    );
  }

  const supplierName = trip.supplier?.full_name || "صاحب مكتب";
  const supplierLogo = trip.supplier?.logo_url;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة
        </Button>

        {/* Trip Image */}
        <div className="relative rounded-xl overflow-hidden mb-6 h-64 md:h-80">
          {trip.image_url ? (
            <img src={trip.image_url} alt={`${trip.from_city} → ${trip.to_city}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-hero-gradient flex items-center justify-center">
              <Bus className="w-16 h-16 text-primary-foreground/40" />
            </div>
          )}
          {trip.is_offer && (
            <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground gap-1 text-sm px-3 py-1">
              <Tag className="w-4 h-4" />
              عرض خاص {trip.offer_type === "percentage" ? `${trip.offer_value}%` : `${trip.offer_value} ر.ي`}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trip Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Route */}
                <div className="flex items-center gap-4 text-2xl font-bold">
                  <MapPin className="w-6 h-6 text-primary" />
                  <span>{trip.from_city}</span>
                  <span className="text-muted-foreground text-lg">→</span>
                  <MapPin className="w-6 h-6 text-destructive" />
                  <span>{trip.to_city}</span>
                </div>

                <Separator />

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">موعد الانطلاق</p>
                      <p className="font-medium">{format(new Date(trip.departure_time), "EEEE dd MMMM yyyy", { locale: ar })}</p>
                      <p className="text-primary font-bold">{format(new Date(trip.departure_time), "HH:mm", { locale: ar })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground text-xs">المقاعد المتاحة</p>
                      <p className="font-bold text-lg">{trip.available_seats}</p>
                    </div>
                  </div>
                  {trip.bus_company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Bus className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">شركة النقل</p>
                        <p className="font-medium">{trip.bus_company}</p>
                        {trip.bus_number && <p className="text-xs text-muted-foreground">باص #{trip.bus_number}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Amenities */}
                {trip.amenities && Array.isArray(trip.amenities) && trip.amenities.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">وسائل الراحة</h3>
                      <div className="flex flex-wrap gap-3">
                        {(trip.amenities as string[]).map((a) => {
                          const info = amenityIcons[a] || { icon: Shield, label: a };
                          const Icon = info.icon;
                          return (
                            <div key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-lg text-sm">
                              <Icon className="w-4 h-4 text-accent-foreground" />
                              <span>{info.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Notes */}
                {trip.notes && (
                  <>
                    <Separator />
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">{trip.notes}</p>
                    </div>
                  </>
                )}

                {/* Supplier Info */}
                <Separator />
                <div className="flex items-center gap-3">
                  {supplierLogo ? (
                    <img src={supplierLogo} alt={supplierName} className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bus className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{supplierName}</p>
                    {trip.supplier?.city && <p className="text-xs text-muted-foreground">{trip.supplier.city}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">حجز المقاعد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">عدد المقاعد</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Button variant="outline" size="icon" onClick={() => setSeatCount(Math.max(1, seatCount - 1))} disabled={seatCount <= 1}>−</Button>
                    <span className="text-xl font-bold w-8 text-center">{seatCount}</span>
                    <Button variant="outline" size="icon" onClick={() => setSeatCount(Math.min(trip.available_seats, seatCount + 1))} disabled={seatCount >= trip.available_seats}>+</Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm">طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً عند الصعود</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي (حسابات المنصة)</SelectItem>
                      <SelectItem value="direct_to_supplier">دفع مباشر لصاحب المكتب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show bank accounts for direct payment */}
                {paymentMethod === "direct_to_supplier" && bankAccounts && bankAccounts.length > 0 && (
                  <div className="bg-accent rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-accent-foreground">حسابات صاحب المكتب البنكية:</p>
                    {bankAccounts.map((acc: any) => (
                      <div key={acc.id} className="text-xs text-accent-foreground">
                        <p>{acc.bank_name} - {acc.account_number}</p>
                        {acc.iban && <p className="text-[10px]">IBAN: {acc.iban}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Price Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>سعر المقعد</span>
                    <span>{Math.round(finalPrice).toLocaleString()} ر.ي</span>
                  </div>
                  {trip.is_offer && trip.offer_value && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>الخصم</span>
                      <span>-{trip.offer_type === "percentage" ? `${trip.offer_value}%` : `${trip.offer_value} ر.ي`}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>عدد المقاعد</span>
                    <span>× {seatCount}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>الإجمالي</span>
                    <span className="text-primary">{Math.round(finalPrice * seatCount).toLocaleString()} ر.ي</span>
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
      </div>
    </div>
  );
};

export default TripDetailsPage;
