import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPartnerSubscriptionStatus, subscribeToPlan, cancelSubscription } from "@/lib/subscriptionApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Crown, RefreshCw } from "lucide-react";

const DeliverySubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    setPlans(((data || []) as any[]).filter((p: any) => !p.is_trial));
    if (user) setStatus(await getPartnerSubscriptionStatus(user.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    setSubscribing(planId);
    try {
      await subscribeToPlan(user.id, planId, cycle);
      toast({ title: "تم الاشتراك بنجاح! سيتم تفعيل الخطة بعد تأكيد الدفع." });
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setSubscribing(null);
  };

  const handleCancel = async () => {
    if (!status?.subscription?.id) return;
    setCancelling(true);
    try {
      await cancelSubscription(status.subscription.id);
      toast({ title: "تم إلغاء الاشتراك" });
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="w-6 h-6 text-yellow-500" />الاشتراك</h1>
          {status?.subscription && (
            <p className="text-sm text-muted-foreground mt-1">
              خطتك الحالية: <strong>{status.plan?.name_ar}</strong> —
              {status.isExpired
                ? " منتهية"
                : ` تنتهي في ${new Date(status.subscription.current_period_end).toLocaleDateString("ar-YE")}`}
              {status.plan?.max_orders_per_month && (
                <span> · {status.ordersUsedThisMonth}/{status.plan.max_orders_per_month} طلب هذا الشهر</span>
              )}
            </p>
          )}
          {!status?.hasActiveSubscription && (
            <p className="text-sm text-destructive mt-1 font-medium">لا يوجد اشتراك نشط</p>
          )}
        </div>
        {status?.hasActiveSubscription && (
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1" /> : null}
            إلغاء الاشتراك
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant={cycle === "monthly" ? "default" : "outline"} size="sm" onClick={() => setCycle("monthly")}>
          شهري
        </Button>
        <Button variant={cycle === "yearly" ? "default" : "outline"} size="sm" onClick={() => setCycle("yearly")}>
          سنوي (وفّر أكثر)
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan: any) => {
          const isCurrent = status?.subscription?.plan_id === plan.id && !status?.isExpired;
          const price = cycle === "monthly" ? plan.price_monthly : plan.price_yearly;
          const isPopular = plan.name === "Growth";
          return (
            <Card key={plan.id} className={`relative ${isCurrent ? "border-primary border-2" : ""} ${isPopular ? "shadow-lg" : ""}`}>
              {isPopular && (
                <div className="absolute -top-3 right-1/2 translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">الأكثر شيوعاً</Badge>
                </div>
              )}
              <CardContent className="p-5 space-y-3">
                {isCurrent && <Badge variant="secondary">✓ خطتك الحالية</Badge>}
                <h3 className="font-bold text-lg">{plan.name_ar}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <p className="text-2xl font-black">
                  {Number(price || 0).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground"> ر.ي / {cycle === "monthly" ? "شهر" : "سنة"}</span>
                </p>
                {plan.commission_override_value && (
                  <p className="text-xs text-green-600 font-bold bg-green-50 dark:bg-green-950/20 rounded px-2 py-1">
                    ✓ عمولة مخفّضة {plan.commission_override_value}%
                  </p>
                )}
                <ul className="space-y-1.5">
                  {((plan.features || []) as string[]).map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || subscribing === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isCurrent ? "نشطة حالياً" : subscribing === plan.id ? "جاري..." : "اشترك الآن"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <p className="text-center text-muted-foreground py-10">لا توجد خطط متاحة حالياً</p>
      )}
    </div>
  );
};

export default DeliverySubscription;
