import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAuditLogs } from "@/lib/adminApi";
import { getGeneratedReports, generateReport, deleteReport, getReportStats, GeneratedReport } from "@/lib/reportsApi";
import { getDailyStats, DailyStats } from "@/lib/monitoringService";
import type { AuditLog } from "@/types/admin.types";
import { Input } from "@/components/ui/input";
import {
  FileText, Search, Download, Trash2, RefreshCw, Users, TrendingUp, DollarSign,
  AlertTriangle, Plane, Package, Truck, Car, BarChart3, PieChart as PieIcon, Loader2
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";

const PERIOD_LABELS: Record<string, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
  yearly: "سنوي",
};

const PIE_COLORS = ["hsl(var(--primary))", "hsl(40,85%,55%)", "hsl(150,60%,40%)", "hsl(0,84%,60%)"];

const AdminReports = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");

  const loadData = useCallback(async () => {
    const [logsRes, reportsData, statsData, daily] = await Promise.all([
      getAuditLogs(),
      getGeneratedReports(),
      getReportStats(period),
      getDailyStats(30),
    ]);
    setLogs((logsRes.data || []) as AuditLog[]);
    setReports(reportsData);
    setStats(statsData);
    setDailyStats(daily);
    setLoading(false);
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async (type: string) => {
    setGenerating(true);
    try {
      await generateReport(type);
      toast.success(`تم إنشاء التقرير ${PERIOD_LABELS[type]} بنجاح`);
      loadData();
    } catch {
      toast.error("خطأ في إنشاء التقرير");
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReport(id);
      toast.success("تم حذف التقرير");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("خطأ في الحذف");
    }
  };

  const exportCSV = () => {
    if (!dailyStats.length) return;
    const headers = ["التاريخ", "المستخدمون", "جدد", "رحلات", "شحنات", "توصيلات", "أجرة", "معاملات", "الإيرادات", "العمولة", "أخطاء"];
    const rows = dailyStats.map((d) =>
      [d.stat_date, d.total_users, d.new_users, d.total_trips, d.total_shipments, d.total_deliveries, d.total_rides, d.total_transactions, d.total_revenue, d.platform_commission, d.error_count].join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report_${period}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  const servicesPieData = stats
    ? [
        { name: "رحلات", value: stats.trips },
        { name: "شحنات", value: stats.shipments },
        { name: "توصيلات", value: stats.deliveries },
        { name: "أجرة", value: stats.rides },
      ]
    : [];

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> التقارير والتحليلات المتقدمة
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 ml-1" /> تصدير CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
          <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-[10px] text-muted-foreground">إجمالي المستخدمين</p>
              <p className="text-xs text-green-600">+{stats.newUsers} جديد</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Plane className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.trips}</p>
              <p className="text-[10px] text-muted-foreground">رحلات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.shipments}</p>
              <p className="text-[10px] text-muted-foreground">شحنات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.deliveries}</p>
              <p className="text-[10px] text-muted-foreground">توصيلات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{Number(stats.totalRevenue).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">الإيرادات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto text-destructive mb-1" />
              <p className="text-2xl font-bold">{stats.errors}</p>
              <p className="text-[10px] text-muted-foreground">أخطاء</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">الرسوم البيانية</TabsTrigger>
          <TabsTrigger value="reports">التقارير المحفوظة</TabsTrigger>
          <TabsTrigger value="audit">سجل التدقيق</TabsTrigger>
        </TabsList>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">نمو المعاملات والمستخدمين</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stat_date" fontSize={10} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(v) => `التاريخ: ${v}`} />
                    <Legend />
                    <Line type="monotone" dataKey="total_transactions" name="المعاملات" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="new_users" name="مستخدمون جدد" stroke="hsl(150,60%,40%)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">توزيع الخدمات</CardTitle></CardHeader>
              <CardContent>
                {servicesPieData.every((s) => s.value === 0) ? (
                  <p className="text-center text-muted-foreground py-12 text-sm">لا توجد بيانات</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={servicesPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                        label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                        {servicesPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">الإيرادات والعمولات (آخر 30 يوم)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stat_date" fontSize={10} tickFormatter={(v) => v?.slice(5)} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={(v) => `التاريخ: ${v}`} />
                    <Legend />
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
                    <Legend />
                    <Bar dataKey="total_trips" name="رحلات" fill="hsl(var(--primary))" stackId="a" />
                    <Bar dataKey="total_shipments" name="شحنات" fill="hsl(40,85%,55%)" stackId="a" />
                    <Bar dataKey="total_deliveries" name="توصيلات" fill="hsl(150,60%,40%)" stackId="a" />
                    <Bar dataKey="total_rides" name="أجرة" fill="hsl(0,84%,60%)" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Saved Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((t) => (
              <Button key={t} size="sm" variant="outline" onClick={() => handleGenerate(t)} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <FileText className="w-4 h-4 ml-1" />}
                إنشاء تقرير {PERIOD_LABELS[t]}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">التقارير المحفوظة</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الفترة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد تقارير</TableCell></TableRow>
                  ) : (
                    reports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{r.title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{PERIOD_LABELS[r.report_type] || r.report_type}</Badge></TableCell>
                        <TableCell className="text-xs">{r.period_start} → {r.period_end}</TableCell>
                        <TableCell><Badge variant={r.status === "completed" ? "default" : "secondary"} className="text-[10px]">{r.status === "completed" ? "مكتمل" : r.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.summary && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-primary">عرض الملخص</summary>
                                <pre className="mt-1 p-2 bg-muted rounded text-[10px] max-w-xs overflow-auto">{JSON.stringify(r.summary, null, 2)}</pre>
                              </details>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في السجلات..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5" /> سجل التدقيق</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الإجراء</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>التفاصيل</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
                  ) : filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell className="text-sm">{log.entity_type || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("ar-YE")} {new Date(log.created_at).toLocaleTimeString("ar-YE")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReports;
