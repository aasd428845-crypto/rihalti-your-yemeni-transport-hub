import { useState, useEffect, useCallback } from "react";
import { Heart, Wrench, RefreshCw, CheckCircle, AlertTriangle, Clock, Loader2, Plane, Package, Truck, Car, Bug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { getAutoHealingLogs, triggerAutoHealing, getSystemHealthStats, AutoHealingLog } from "@/lib/autoHealingApi";
import { toast } from "sonner";

const ACTION_LABELS: Record<string, string> = {
  fix_stuck_trip: "إصلاح رحلة عالقة",
  fix_stuck_shipment: "إصلاح شحنة عالقة",
  fix_stuck_delivery: "إصلاح توصيل عالق",
  fix_stuck_ride: "إصلاح أجرة عالقة",
  auto_resolve_errors: "حل أخطاء قديمة",
};

const ACTION_ICONS: Record<string, any> = {
  fix_stuck_trip: Plane,
  fix_stuck_shipment: Package,
  fix_stuck_delivery: Truck,
  fix_stuck_ride: Car,
  auto_resolve_errors: Bug,
};

const SystemHealthTab = () => {
  const [logs, setLogs] = useState<AutoHealingLog[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [healing, setHealing] = useState(false);

  const loadData = useCallback(async () => {
    const [logsData, healthData] = await Promise.all([
      getAutoHealingLogs(50),
      getSystemHealthStats(),
    ]);
    setLogs(logsData);
    setHealth(healthData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTriggerHealing = async () => {
    setHealing(true);
    try {
      const result = await triggerAutoHealing();
      toast.success(`تم الإصلاح التلقائي: ${result?.total_fixed || 0} عنصر`);
      loadData();
    } catch {
      toast.error("خطأ في تشغيل الإصلاح التلقائي");
    }
    setHealing(false);
  };

  const totalIssues = health
    ? health.stuckTrips + health.stuckShipments + health.stuckDeliveries + health.stuckRides + health.unresolvedErrors
    : 0;

  const healthScore = health ? Math.max(0, 100 - totalIssues * 5) : 100;
  const healthColor = healthScore >= 80 ? "text-green-600" : healthScore >= 50 ? "text-yellow-600" : "text-red-600";
  const healthBg = healthScore >= 80 ? "bg-green-100 dark:bg-green-900" : healthScore >= 50 ? "bg-yellow-100 dark:bg-yellow-900" : "bg-red-100 dark:bg-red-900";

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Health Score + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${healthBg}`}>
            <Heart className={`w-8 h-8 ${healthColor}`} />
          </div>
          <div>
            <p className={`text-3xl font-bold ${healthColor}`}>{healthScore}%</p>
            <p className="text-sm text-muted-foreground">صحة النظام</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
          <Button size="sm" onClick={handleTriggerHealing} disabled={healing}>
            {healing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Wrench className="w-4 h-4 ml-1" />}
            إصلاح تلقائي
          </Button>
        </div>
      </div>

      {/* Issue Cards */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "رحلات عالقة", value: health.stuckTrips, icon: Plane },
            { label: "شحنات عالقة", value: health.stuckShipments, icon: Package },
            { label: "توصيلات عالقة", value: health.stuckDeliveries, icon: Truck },
            { label: "أجرة عالقة", value: health.stuckRides, icon: Car },
            { label: "أخطاء غير محلولة", value: health.unresolvedErrors, icon: Bug },
            { label: "إصلاحات اليوم", value: health.healingActionsToday, icon: Wrench },
          ].map((item, i) => {
            const Icon = item.icon;
            const hasIssue = i < 5 && item.value > 0;
            return (
              <Card key={i} className={hasIssue ? "border-destructive/50" : ""}>
                <CardContent className="p-3 text-center">
                  <Icon className={`w-4 h-4 mx-auto mb-1 ${hasIssue ? "text-destructive" : "text-muted-foreground"}`} />
                  <p className={`text-xl font-bold ${hasIssue ? "text-destructive" : ""}`}>{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Healing Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" /> سجل الإصلاح التلقائي
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 max-h-[500px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">لا توجد عمليات إصلاح مسجلة</p>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const Icon = ACTION_ICONS[log.action_type] || Wrench;
                return (
                  <div key={log.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{ACTION_LABELS[log.action_type] || log.action_type}</p>
                        <p className="text-xs text-muted-foreground">{log.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-[10px]">
                        {log.status === "success" ? <CheckCircle className="w-3 h-3 ml-1" /> : <AlertTriangle className="w-3 h-3 ml-1" />}
                        {log.status === "success" ? "نجح" : "فشل"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealthTab;
