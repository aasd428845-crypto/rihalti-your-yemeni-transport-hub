import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Bell, X, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertHistoryItem, acknowledgeAlert, resolveAlert } from "@/lib/alertsApi";
import { toast } from "sonner";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  critical: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200",
};

interface Props {
  alerts: AlertHistoryItem[];
  onUpdate: () => void;
}

const AlertHistoryList = ({ alerts, onUpdate }: Props) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    setLoading(id);
    try {
      await acknowledgeAlert(id);
      toast.success("تم الاطلاع على التنبيه");
      onUpdate();
    } catch { toast.error("خطأ"); }
    setLoading(null);
  };

  const handleResolve = async (id: string) => {
    setLoading(id);
    try {
      await resolveAlert(id);
      toast.success("تم حل التنبيه");
      onUpdate();
    } catch { toast.error("خطأ"); }
    setLoading(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" /> سجل التنبيهات
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 max-h-[500px] overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">لا توجد تنبيهات</p>
        ) : (
          <div className="divide-y">
            {alerts.map((a) => {
              const severity = a.alert_rules?.severity || "warning";
              return (
                <div key={a.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SEVERITY_COLORS[severity] || SEVERITY_COLORS.warning}`}>
                        {severity}
                      </span>
                      {a.alert_rules?.rule_name && (
                        <Badge variant="outline" className="text-[10px]">{a.alert_rules.rule_name}</Badge>
                      )}
                      {a.resolved_at && (
                        <Badge className="bg-green-100 text-green-800 text-[10px]">
                          <CheckCircle className="w-3 h-3 ml-1" /> محلول
                        </Badge>
                      )}
                      {!a.resolved_at && a.is_acknowledged && (
                        <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                          <Eye className="w-3 h-3 ml-1" /> تم الاطلاع
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.triggered_at), "dd/MM HH:mm:ss")}
                    </span>
                  </div>
                  <p className="font-medium">{a.message}</p>
                  {a.metric_value != null && (
                    <p className="text-xs text-muted-foreground mt-1">القيمة: {a.metric_value}</p>
                  )}
                  {!a.resolved_at && (
                    <div className="flex gap-2 mt-2">
                      {!a.is_acknowledged && (
                        <Button size="sm" variant="outline" className="h-6 text-xs"
                          disabled={loading === a.id} onClick={() => handleAcknowledge(a.id)}>
                          <Eye className="w-3 h-3 ml-1" /> اطلاع
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 text-xs text-green-600"
                        disabled={loading === a.id} onClick={() => handleResolve(a.id)}>
                        <CheckCircle className="w-3 h-3 ml-1" /> حل
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertHistoryList;
