import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "نشط", color: "bg-green-100 text-green-700" },
  pending_payment: { label: "في انتظار الدفع", color: "bg-amber-100 text-amber-700" },
  cancelled: { label: "ملغى", color: "bg-red-100 text-red-700" },
  expired: { label: "منتهي", color: "bg-gray-100 text-gray-600" },
};

const AdminPartnerSubscriptions = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [grantTarget, setGrantTarget] = useState<{ partnerId: string; companyName: string } | null>(null);
  const [grantPlanId, setGrantPlanId] = useState("");
  const [grantDuration, setGrantDuration] = useState(1);
  const [grantUnit, setGrantUnit] = useState<"days" | "months">("months");
  const [granting, setGranting] = useState(false);
  const [allPlans, setAllPlans] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("partner_subscriptions")
      .select("*, subscription_plans(name_ar, commission_override_value)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data: subs, error } = await q;
    if (error) {
      toast({ title: "خطأ في التحميل", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (subs && subs.length > 0) {
      const partnerIds = [...new Set(subs.map((s: any) => s.partner_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", partnerIds as string[]);
      const profileMap: Record<string, string> = {};
      (profilesData || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
      setSubscriptions(subs.map((s: any) => ({ ...s, partnerName: profileMap[s.partner_id] || s.partner_id.slice(0, 8) })));
    } else {
      setSubscriptions([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    supabase.from("subscription_plans" as any).select("id, name_ar").eq("is_active", true).order("sort_order")
      .then(({ data }: { data: any }) => setAllPlans(data || []));
  }, []);

  const handleExtend = async (sub: any) => {
    setActionLoading(sub.id);
    try {
      const newEnd = new Date(new Date(sub.current_period_end).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await (supabase as any)
        .from("partner_subscriptions")
        .update({ current_period_end: newEnd, updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      if (error) throw error;
      toast({ title: "✓ تم تمديد الاشتراك 30 يوماً" });
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleSuspend = async (sub: any) => {
    setActionLoading(sub.id + "-suspend");
    try {
      const { error } = await (supabase as any)
        .from("partner_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      if (error) throw error;
      toast({ title: "✓ تم تعليق الاشتراك" });
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleActivate = async (sub: any) => {
    setActionLoading(sub.id + "-activate");
    try {
      const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await (supabase as any)
        .from("partner_subscriptions")
        .update({
          status: "active",
          current_period_end: newEnd,
          last_payment_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (error) throw error;
      toast({ title: "✓ تم تفعيل الاشتراك يدوياً لمدة 30 يوماً" });
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const handleGrantFreePeriod = async () => {
    if (!grantTarget || !grantPlanId) return;
    setGranting(true);
    try {
      await (supabase as any)
        .from("partner_subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("partner_id", grantTarget.partnerId)
        .eq("status", "active");

      const now = new Date();
      const periodEnd = new Date(now);
      if (grantUnit === "days") {
        periodEnd.setDate(periodEnd.getDate() + grantDuration);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + grantDuration);
      }

      const { error } = await (supabase as any).from("partner_subscriptions").insert({
        partner_id: grantTarget.partnerId,
        partner_type: "delivery_company",
        plan_id: grantPlanId,
        status: "active",
        billing_cycle: "monthly",
        started_at: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        auto_renew: false,
      });

      if (error) throw error;

      toast({ title: `✓ تم منح ${grantTarget.companyName} فترة مجانية حتى ${periodEnd.toLocaleDateString("ar")}` });
      setGrantDialogOpen(false);
      setGrantTarget(null);
      setGrantPlanId("");
      setGrantDuration(1);
      await load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setGranting(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-5" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" />اشتراكات الشركاء</h1>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="pending_payment">في انتظار الدفع</SelectItem>
              <SelectItem value="cancelled">ملغى</SelectItem>
              <SelectItem value="expired">منتهي</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد اشتراكات بهذه الحالة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub: any) => {
            const statusInfo = STATUS_LABELS[sub.status] || { label: sub.status, color: "bg-gray-100 text-gray-600" };
            const periodEnd = new Date(sub.current_period_end);
            const isExpired = periodEnd < new Date();
            return (
              <Card key={sub.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-bold">{sub.partnerName}</p>
                      <p className="text-sm text-muted-foreground">{(sub.subscription_plans as any)?.name_ar || "—"}</p>
                      {(sub.subscription_plans as any)?.commission_override_value && (
                        <p className="text-xs text-green-600 font-medium">عمولة مخفّضة: {(sub.subscription_plans as any).commission_override_value}%</p>
                      )}
                    </div>

                    <div className="text-center min-w-[90px]">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {sub.billing_cycle === "yearly" ? "سنوي" : "شهري"}
                      </p>
                    </div>

                    <div className="text-center min-w-[110px]">
                      <p className="text-xs text-muted-foreground">البداية</p>
                      <p className="text-sm font-medium">{new Date(sub.started_at).toLocaleDateString("ar-YE")}</p>
                    </div>

                    <div className="text-center min-w-[110px]">
                      <p className="text-xs text-muted-foreground">الانتهاء</p>
                      <p className={`text-sm font-medium ${isExpired ? "text-destructive" : ""}`}>
                        {periodEnd.toLocaleDateString("ar-YE")}
                      </p>
                      {isExpired && <p className="text-[10px] text-destructive">منتهية</p>}
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExtend(sub)}
                        disabled={actionLoading === sub.id}
                        className="text-xs"
                      >
                        {actionLoading === sub.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "تمديد 30 يوم"}
                      </Button>
                      {sub.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuspend(sub)}
                          disabled={actionLoading === sub.id + "-suspend"}
                          className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          تعليق
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActivate(sub)}
                          disabled={actionLoading === sub.id + "-activate"}
                          className="text-xs text-green-600 border-green-600/30 hover:bg-green-50"
                        >
                          تفعيل يدوي
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setGrantTarget({ partnerId: sub.partner_id, companyName: sub.partnerName });
                          setGrantDialogOpen(true);
                        }}
                        className="text-xs"
                      >
                        🎁 منح فترة مجانية
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>منح فترة مجانية — {grantTarget?.companyName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>الخطة الممنوحة</Label>
              <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                <SelectTrigger><SelectValue placeholder="اختر خطة" /></SelectTrigger>
                <SelectContent>
                  {allPlans.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Label>المدة</Label>
                <Input
                  type="number"
                  min={1}
                  value={grantDuration}
                  onChange={(e) => setGrantDuration(Number(e.target.value))}
                />
              </div>
              <div className="flex-1">
                <Label>الوحدة</Label>
                <Select value={grantUnit} onValueChange={(v) => setGrantUnit(v as "days" | "months")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">يوم</SelectItem>
                    <SelectItem value="months">شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              سيتم إلغاء أي اشتراك نشط حالي لهذه الشركة واستبداله بهذه الفترة المجانية.
            </p>

            <Button
              className="w-full"
              disabled={!grantPlanId || granting}
              onClick={handleGrantFreePeriod}
            >
              {granting ? "جارٍ المنح..." : "منح الفترة المجانية"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartnerSubscriptions;
