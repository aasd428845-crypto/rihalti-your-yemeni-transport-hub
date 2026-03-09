import { useEffect, useState, useCallback } from "react";
import { Activity, AlertTriangle, Eye, CheckCircle, Clock, Zap, Bug, Radio, RefreshCw, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import {
  LiveEvent, ErrorLog, getRecentEvents, getRecentErrors, getMonitoringSummary,
  getDailyStats, resolveError, subscribeToEvents, DailyStats
} from "@/lib/monitoringService";
import { AlertRule, AlertHistoryItem, getAlertRules, getAlertHistory, subscribeToAlerts } from "@/lib/alertsApi";
import AlertRulesManager from "@/components/admin/monitoring/AlertRulesManager";
import AlertHistoryList from "@/components/admin/monitoring/AlertHistoryList";
import SystemHealthTab from "@/components/admin/monitoring/SystemHealthTab";
import { toast } from "sonner";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  critical: "bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200",
};

const EVENT_LABELS: Record<string, string> = {
  trip_created: "رحلة جديدة ✈️",
  shipment_requested: "طلب شحن 📦",
  delivery_created: "طلب توصيل 🛵",
  ride_requested: "طلب أجرة 🚖",
  user_registered: "تسجيل مستخدم 👤",
  payment_completed: "معاملة مالية 💰",
  booking_created: "حجز جديد 🎫",
  error_occurred: "خطأ ⚠️",
  alert_triggered: "تنبيه 🔔",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(40,85%,55%)", "hsl(150,60%,40%)", "hsl(0,84%,60%)", "hsl(270,60%,50%)", "hsl(200,70%,50%)"];

const AdminMonitoring = () => {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState({ eventsToday: 0, unresolvedErrors: 0, errorsToday: 0, eventsLastHour: 0 });
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [ev, er, sum, ds, rules, history] = await Promise.all([
      getRecentEvents(100),
      getRecentErrors(50),
      getMonitoringSummary(),
      getDailyStats(30),
      getAlertRules(),
      getAlertHistory(50),
    ]);
    setEvents(ev);
    setErrors(er);
    setSummary(sum);
    setDailyStats(ds);
    setAlertRules(rules);
    setAlertHistory(history);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const unsubEvents = subscribeToEvents(
      (e) => {
        setEvents((prev) => [e, ...prev].slice(0, 200));
        setSummary((s) => ({ ...s, eventsToday: s.eventsToday + 1, eventsLastHour: s.eventsLastHour + 1 }));
      },
      (e) => {
        setErrors((prev) => [e, ...prev].slice(0, 100));
        setSummary((s) => ({ ...s, unresolvedErrors: s.unresolvedErrors + 1, errorsToday: s.errorsToday + 1 }));
        toast.error("خطأ جديد: " + e.error_message);
      }
    );
    const unsubAlerts = subscribeToAlerts((a) => {
      setAlertHistory((prev) => [a, ...prev].slice(0, 100));
      toast.warning("🔔 تنبيه: " + a.message);
    });
    return () => { unsubEvents(); unsubAlerts(); };
  }, [loadData]);

  const handleResolve = async (id: string) => {
    await resolveError(id);
    setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, is_resolved: true, resolved_at: new Date().toISOString() } : e)));
    setSummary((s) => ({ ...s, unresolvedErrors: Math.max(0, s.unresolvedErrors - 1) }));
    toast.success("تم حل الخطأ");
  };

  const unacknowledgedAlerts = alertHistory.filter((a) => !a.is_acknowledged && !a.resolved_at).length;

  const eventTypeCounts = events.reduce((acc: Record<string, number>, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(eventTypeCounts).map(([name, value]) => ({
    name: EVENT_LABELS[name] || name,
    value,
  }));

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">المراقبة والتحليلات</h2>
          <Badge variant="outline" className="text-xs animate-pulse">
            <Radio className="w-3 h-3 ml-1" /> مباشر
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4 ml-1" /> تحديث</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Zap className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{summary.eventsLastHour}</p><p className="text-xs text-muted-foreground">أحداث آخر ساعة</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900"><Eye className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{summary.eventsToday}</p><p className="text-xs text-muted-foreground">أحداث اليوم</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900"><Bug className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-2xl font-bold">{summary.unresolvedErrors}</p><p className="text-xs text-muted-foreground">أخطاء غير محلولة</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-2xl font-bold">{summary.errorsToday}</p><p className="text-xs text-muted-foreground">أخطاء اليوم</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900"><Bell className="w-5 h-5 text-orange-600" /></div>
            <div><p className="text-2xl font-bold">{unacknowledgedAlerts}</p><p className="text-xs text-muted-foreground">تنبيهات نشطة</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">الأحداث المباشرة</TabsTrigger>
          <TabsTrigger value="errors">سجل الأخطاء</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            التنبيهات
            {unacknowledgedAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unacknowledgedAlerts}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="daily">الإحصائيات اليومية</TabsTrigger>
        </TabsList>

        {/* Live Events Tab */}
        <TabsContent value="live" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">بث الأحداث المباشر</CardTitle></CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">لا توجد أحداث مسجلة</p>
                ) : (
                  <div className="divide-y">
                    {events.slice(0, 50).map((e) => (
                      <div key={e.id} className="px-4 py-3 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SEVERITY_COLORS[e.severity] || SEVERITY_COLORS.info}`}>
                            {e.severity}
                          </span>
                          <div>
                            <p className="font-medium">{EVENT_LABELS[e.event_type] || e.event_type}</p>
                            {e.entity_type && <p className="text-xs text-muted-foreground">{e.entity_type}: {e.entity_id?.slice(0, 8)}...</p>}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{format(new Date(e.created_at), "HH:mm:ss")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">توزيع الأحداث</CardTitle></CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                        label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bug className="w-4 h-4" /> سجل الأخطاء</CardTitle></CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              {errors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">لا توجد أخطاء مسجلة</p>
              ) : (
                <div className="divide-y">
                  {errors.map((e) => (
                    <div key={e.id} className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${SEVERITY_COLORS[e.severity]}`}>{e.severity}</span>
                          {e.error_code && <Badge variant="outline" className="text-[10px]">{e.error_code}</Badge>}
                          {e.is_resolved && <Badge className="bg-green-100 text-green-800 text-[10px]"><CheckCircle className="w-3 h-3 ml-1" /> محلول</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{format(new Date(e.created_at), "dd/MM HH:mm:ss")}</span>
                          {!e.is_resolved && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-green-600" onClick={() => handleResolve(e.id)}>
                              <CheckCircle className="w-3 h-3 ml-1" /> حل
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="font-medium">{e.error_message}</p>
                      {e.endpoint && <p className="text-xs text-muted-foreground mt-1">النقطة: {e.endpoint}</p>}
                      {e.stack_trace && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">تتبع الخطأ</summary>
                          <pre className="text-[10px] mt-1 p-2 bg-muted rounded overflow-x-auto">{e.stack_trace}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertRulesManager rules={alertRules} onUpdate={loadData} />
            <AlertHistoryList alerts={alertHistory} onUpdate={loadData} />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">نمو المعاملات (آخر 30 يوم)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stat_date" fontSize={10} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(v) => `التاريخ: ${v}`} />
                    <Line type="monotone" dataKey="total_transactions" name="المعاملات" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="new_users" name="مستخدمون جدد" stroke="hsl(150,60%,40%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">الإيرادات والعمولات</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stat_date" fontSize={10} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(v) => `التاريخ: ${v}`} />
                    <Bar dataKey="total_revenue" name="الإيرادات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="platform_commission" name="العمولة" fill="hsl(40,85%,55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">توزيع الخدمات اليومي</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stat_date" fontSize={10} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(v) => `التاريخ: ${v}`} />
                    <Bar dataKey="total_trips" name="رحلات" fill="hsl(var(--primary))" stackId="a" />
                    <Bar dataKey="total_shipments" name="شحنات" fill="hsl(40,85%,55%)" stackId="a" />
                    <Bar dataKey="total_deliveries" name="توصيلات" fill="hsl(150,60%,40%)" stackId="a" />
                    <Bar dataKey="total_rides" name="أجرة" fill="hsl(0,84%,60%)" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">الأخطاء اليومية</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stat_date" fontSize={10} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(v) => `التاريخ: ${v}`} />
                    <Bar dataKey="error_count" name="أخطاء" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Daily Stats Tab */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">الإحصائيات اليومية التفصيلية</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-right">التاريخ</th>
                    <th className="px-3 py-2 text-right">المستخدمون</th>
                    <th className="px-3 py-2 text-right">جدد</th>
                    <th className="px-3 py-2 text-right">رحلات</th>
                    <th className="px-3 py-2 text-right">شحنات</th>
                    <th className="px-3 py-2 text-right">توصيلات</th>
                    <th className="px-3 py-2 text-right">أجرة</th>
                    <th className="px-3 py-2 text-right">معاملات</th>
                    <th className="px-3 py-2 text-right">الإيرادات</th>
                    <th className="px-3 py-2 text-right">العمولة</th>
                    <th className="px-3 py-2 text-right">أخطاء</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">لا توجد بيانات</td></tr>
                  ) : (
                    [...dailyStats].reverse().map((d) => (
                      <tr key={d.id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{d.stat_date}</td>
                        <td className="px-3 py-2">{d.total_users}</td>
                        <td className="px-3 py-2">{d.new_users}</td>
                        <td className="px-3 py-2">{d.total_trips}</td>
                        <td className="px-3 py-2">{d.total_shipments}</td>
                        <td className="px-3 py-2">{d.total_deliveries}</td>
                        <td className="px-3 py-2">{d.total_rides}</td>
                        <td className="px-3 py-2">{d.total_transactions}</td>
                        <td className="px-3 py-2">{Number(d.total_revenue).toLocaleString()}</td>
                        <td className="px-3 py-2">{Number(d.platform_commission).toLocaleString()}</td>
                        <td className="px-3 py-2">{d.error_count > 0 ? <Badge variant="destructive" className="text-[10px]">{d.error_count}</Badge> : "0"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMonitoring;
