import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Clock, CheckCircle, Truck, MapPin, Phone, Star, ChefHat, ArrowRight, DollarSign, Wallet, Banknote, CreditCard } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { createReview } from "@/lib/restaurantApi";

const statusSteps = [
  { key: "pending", label: "قيد المراجعة", icon: Clock, color: "text-yellow-500" },
  { key: "accepted", label: "تم القبول", icon: CheckCircle, color: "text-blue-500" },
  { key: "preparing", label: "يتم التحضير", icon: ChefHat, color: "text-orange-500" },
  { key: "ready", label: "جاهز للتوصيل", icon: Package, color: "text-purple-500" },
  { key: "delivering", label: "في الطريق", icon: Truck, color: "text-primary" },
  { key: "delivered", label: "تم التوصيل", icon: CheckCircle, color: "text-green-500" },
];

const OrderTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [companyBanks, setCompanyBanks] = useState<any[]>([]);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("delivery_orders")
          .select("*")
          .eq("id", id)
          .single();
        if (error) throw error;
        setOrder(data);
        if (data.restaurant_id) {
          const { data: r } = await supabase
            .from("restaurants")
            .select("id, name_ar, logo_url, phone")
            .eq("id", data.restaurant_id)
            .single();
          setRestaurant(r);
        }
        // Load company payment options for payment selection card
        if (data.delivery_company_id) {
          const [{ data: settings }, { data: banks }] = await Promise.all([
            supabase.from("partner_settings" as any)
              .select("cash_on_delivery_enabled")
              .eq("partner_id", data.delivery_company_id)
              .maybeSingle(),
            supabase.from("partner_bank_accounts")
              .select("*")
              .eq("partner_id", data.delivery_company_id),
          ]);
          if (settings) setCashEnabled((settings as any).cash_on_delivery_enabled ?? true);
          setCompanyBanks(banks || []);
        }
      } catch (err: any) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
    };
    load();

    // Realtime subscription
    const channel = supabase
      .channel(`order-track-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "delivery_orders",
        filter: `id=eq.${id}`,
      }, (payload) => {
        setOrder(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const currentStepIndex = statusSteps.findIndex(s => s.key === order?.status);

  const choosePayment = async (method: "cash" | "bank_transfer") => {
    if (!order?.id) return;
    setSavingPayment(true);
    try {
      const { data, error } = await supabase
        .from("delivery_orders")
        .update({
          payment_method: method,
          status: "confirmed",
          payment_status: method === "bank_transfer" ? "pending" : "pending",
        })
        .eq("id", order.id)
        .select()
        .single();
      if (error) throw error;
      setOrder(data);

      // Notify the company that customer chose
      if (order.delivery_company_id) {
        try {
          await (supabase.from as any)("notifications").insert({
            user_id: order.delivery_company_id,
            title: "💳 العميل اختار طريقة الدفع",
            body: `${order.customer_name || "العميل"} اختار: ${method === "cash" ? "نقداً عند الاستلام" : "تحويل بنكي"} — المبلغ: ${Number(order.total).toLocaleString()} ر.ي`,
            data: { type: "payment_chosen", order_id: order.id, url: "/delivery/orders" },
            is_read: false,
          });
        } catch (_) {}
      }

      toast({
        title: "تم تأكيد طريقة الدفع",
        description: method === "cash"
          ? "سيقوم المندوب بتحصيل المبلغ عند الاستلام"
          : "يرجى تحويل المبلغ إلى أحد حسابات الشركة المعروضة",
      });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSavingPayment(false);
    }
  };

  const needsPaymentChoice = order?.status === "priced" && !order?.payment_method;

  const handleReview = async () => {
    if (!user || !order?.restaurant_id) return;
    setSubmittingReview(true);
    try {
      await createReview({
        restaurant_id: order.restaurant_id,
        customer_id: user.id,
        rating: reviewRating,
        review: reviewText || undefined,
      });
      toast({ title: "شكراً لتقييمك! ⭐" });
      setShowReview(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSubmittingReview(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!order) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground">الطلب غير موجود</p>
      <Button onClick={() => navigate("/history")} className="mt-4">العودة للطلبات</Button>
    </div>
  );

  const items = (order.items || []) as any[];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <BackButton />
        <h1 className="text-2xl font-bold mb-6">تتبع الطلب</h1>

        {/* Status Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-0">
              {statusSteps.map((step, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCurrent ? "border-primary bg-primary text-primary-foreground" :
                        isActive ? "border-primary/50 bg-primary/10 text-primary" :
                        "border-muted bg-muted text-muted-foreground"
                      }`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      {i < statusSteps.length - 1 && (
                        <div className={`w-0.5 h-8 ${isActive ? "bg-primary/50" : "bg-muted"}`} />
                      )}
                    </div>
                    <div className="pt-2">
                      <p className={`font-medium text-sm ${isCurrent ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {order.status === "cancelled" && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                <p className="text-destructive font-medium">تم إلغاء الطلب</p>
                {order.cancellation_reason && <p className="text-sm text-muted-foreground mt-1">{order.cancellation_reason}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restaurant Info */}
        {restaurant && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {restaurant.logo_url && (
                  <img src={restaurant.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <h3 className="font-bold">{restaurant.name_ar}</h3>
                  {restaurant.phone && (
                    <a href={`tel:${restaurant.phone}`} className="text-sm text-primary flex items-center gap-1 mt-1">
                      <Phone className="w-3.5 h-3.5" /> {restaurant.phone}
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Selection (after company prices the order) */}
        {needsPaymentChoice && (
          <Card className="mb-6 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                تم تسعير طلبك — اختر طريقة الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-card border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">المبلغ المطلوب</p>
                <p className="text-2xl font-black text-primary">{Number(order.total).toLocaleString()} ر.ي</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cashEnabled && (
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2 border-2 hover:border-primary"
                    onClick={() => choosePayment("cash")}
                    disabled={savingPayment}
                  >
                    <Banknote className="w-7 h-7 text-green-600" />
                    <span className="font-bold">نقداً عند الاستلام</span>
                    <span className="text-[11px] text-muted-foreground">يدفع عند وصول المندوب</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 border-2 hover:border-primary"
                  onClick={() => choosePayment("bank_transfer")}
                  disabled={savingPayment}
                >
                  <CreditCard className="w-7 h-7 text-blue-600" />
                  <span className="font-bold">تحويل بنكي</span>
                  <span className="text-[11px] text-muted-foreground">دفع مسبق على حساب الشركة</span>
                </Button>
              </div>

              {!cashEnabled && (
                <p className="text-xs text-amber-700 bg-amber-100 dark:bg-amber-950/40 rounded-lg px-3 py-2">
                  ⚠️ شركة التوصيل تقبل الدفع بالتحويل البنكي فقط.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bank Accounts (after customer chose bank_transfer) */}
        {order?.payment_method === "bank_transfer" && companyBanks.length > 0 && (
          <Card className="mb-6 border-green-300 dark:border-green-800 bg-green-50/40 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-600" /> حوّل المبلغ إلى أحد هذه الحسابات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {companyBanks.map((b: any) => (
                <div key={b.id} className="bg-card border rounded-lg p-3 text-sm space-y-1">
                  <p className="font-bold">{b.bank_name} — {b.account_name}</p>
                  <p className="text-muted-foreground" dir="ltr">رقم الحساب: {b.account_number}</p>
                  {b.iban && <p className="text-muted-foreground" dir="ltr">IBAN: {b.iban}</p>}
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground mt-2">
                💡 احتفظ بإيصال التحويل وأرسله لشركة التوصيل لتأكيد الدفع.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">تفاصيل الطلب</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.name_ar} × {item.quantity}</span>
                <span className="font-medium">{(item.price * item.quantity)} ر.ي</span>
              </div>
            ))}
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>المجموع الفرعي</span><span>{order.subtotal} ر.ي</span></div>
              <div className="flex justify-between"><span>رسوم التوصيل</span><span>{order.delivery_fee === 0 ? "مجاني" : `${order.delivery_fee} ر.ي`}</span></div>
              {order.tax > 0 && <div className="flex justify-between"><span>الضريبة</span><span>{order.tax} ر.ي</span></div>}
              <Separator />
              <div className="flex justify-between font-bold text-base"><span>الإجمالي</span><span className="text-primary">{order.total} ر.ي</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-2 text-sm">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /><span>{order.customer_address}</span></div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{order.customer_phone}</span></div>
            {order.notes && <div className="text-muted-foreground">ملاحظات: {order.notes}</div>}
          </CardContent>
        </Card>

        {/* Review Button */}
        {order.status === "delivered" && order.restaurant_id && (
          <Button className="w-full gap-2 mb-6" variant="outline" onClick={() => setShowReview(true)}>
            <Star className="w-4 h-4" /> تقييم الطلب
          </Button>
        )}

        <Button variant="ghost" className="w-full gap-2" onClick={() => navigate("/history")}>
          العودة للطلبات <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تقييم الطلب</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setReviewRating(s)}>
                  <Star className={`w-8 h-8 ${s <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="اكتب تعليقك (اختياري)..." />
          </div>
          <DialogFooter>
            <Button onClick={handleReview} disabled={submittingReview}>
              {submittingReview ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderTrackingPage;
