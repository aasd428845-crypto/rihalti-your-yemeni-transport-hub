import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, TrendingUp, Truck, DollarSign, Clock, Receipt, Headphones, UserPlus, Car, ShoppingBag, AlertTriangle, ArrowLeft } from "lucide-react";
import { getDashboardStats } from "@/lib/adminApi";
import StatCard from "@/components/admin/dashboard/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(40, 85%, 55%)", "hsl(150, 60%, 40%)", "hsl(0, 84%, 60%)"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((data) => { setStats(data); setLoading(false); });
  }, []);

  if (loading || !stats) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const invStatusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", overdue: "bg-red-100 text-red-800" };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold">لوحة التحكم</h2>

      {/* Alerts */}
      {(stats.overdueInvoiceCount > 0 || stats.joinRequests > 0) && (
        <div className="flex flex-wrap gap-3">
          {stats.overdueInvoiceCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm cursor-pointer" onClick={() => navigate("/admin/invoices")}>
              <AlertTriangle className="w-4 h-4" />
              <span>{stats.overdueInvoiceCount} فاتورة متأخرة ({stats.overdueInvoiceTotal.toLocaleString()} ر.ي)</span>
            </div>
          )}
          {stats.joinRequests > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-lg text-sm cursor-pointer" onClick={() => navigate("/admin/join-requests")}>
              <UserPlus className="w-4 h-4" />
              <span>{stats.joinRequests} طلب انضمام جديد</span>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المستخدمين" value={stats.totalUsers} icon={Users} description={`عملاء: ${stats.customers} | موردون: ${stats.suppliers} | توصيل: ${stats.deliveryCompanies} | سائقون: ${stats.drivers}`} />
        <StatCard title="المعاملات" value={stats.txMonth} icon={TrendingUp} description={`اليوم: ${stats.txToday} | الأسبوع: ${stats.txWeek}`} />
        <StatCard title="إيرادات المنصة" value={`${stats.platformEarnings.toLocaleString()} ر.ي`} icon={DollarSign} description={`إجمالي المعاملات: ${stats.totalRevenue.toLocaleString()} ر.ي`} />
        <StatCard title="الفواتير المستحقة" value={stats.pendingInvoiceCount + stats.overdueInvoiceCount} icon={Receipt} description={`معلقة: ${stats.pendingInvoiceTotal.toLocaleString()} | متأخرة: ${stats.overdueInvoiceTotal.toLocaleString()} ر.ي`} />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="طلبات معلقة" value={stats.pendingApprovals} icon={Clock} />
        <StatCard title="رسائل الدعم" value={stats.unreadSupport} icon={Headphones} description="محادثات مفتوحة" />
        <StatCard title="الرحلات" value={stats.totalTrips} icon={Car} />
        <StatCard title="التوصيلات" value={stats.totalDeliveries} icon={ShoppingBag} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-day transactions line chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">نمو المعاملات (آخر 30 يوم)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                <YAxis fontSize={11} />
                <Tooltip labelFormatter={(v) => `التاريخ: ${v}`} />
                <Legend />
                <Line type="monotone" dataKey="count" name="عدد المعاملات" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="commission" name="العمولة" stroke="hsl(40, 85%, 55%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction type distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">توزيع المعاملات</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stats.typeDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                  {stats.typeDistribution.map((_: any, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">إيرادات المنصة (آخر 30 يوم)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.dailyChartData.filter((_: any, i: number) => i % 3 === 0)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.slice(5)} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" name="الإيرادات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commission" name="العمولة" fill="hsl(40, 85%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">آخر المعاملات</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/transactions")}>عرض الكل</Button>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">لا توجد معاملات</p>
            ) : (
              <div className="divide-y">
                {stats.recentTransactions.map((tx: any) => (
                  <div key={tx.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{tx.partner_name || tx.partner_id?.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "dd/MM HH:mm")}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{Number(tx.amount).toLocaleString()} ر.ي</p>
                      <Badge variant="outline" className="text-[10px]">
                        {tx.transaction_type === "booking" ? "حجز" : tx.transaction_type === "shipment" ? "طرد" : tx.transaction_type === "delivery" ? "توصيل" : "أجرة"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Support + Invoices */}
        <div className="space-y-6">
          {/* Support */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">رسائل الدعم المفتوحة</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/support-messages")}>عرض الكل</Button>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recentSupport.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">لا توجد رسائل</p>
              ) : (
                <div className="divide-y">
                  {stats.recentSupport.map((conv: any) => (
                    <div key={conv.id} className="px-4 py-3 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50" onClick={() => navigate("/admin/support-messages")}>
                      <p className="font-medium">{conv.subject || "بدون موضوع"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(conv.created_at), "dd/MM HH:mm")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">فواتير مستحقة</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/invoices")}>عرض الكل</Button>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recentInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">لا توجد فواتير مستحقة</p>
              ) : (
                <div className="divide-y">
                  {stats.recentInvoices.map((inv: any) => (
                    <div key={inv.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-mono text-xs">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">استحقاق: {inv.due_date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{Number(inv.total_commission).toLocaleString()} ر.ي</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${invStatusColors[inv.status] || ""}`}>
                          {inv.status === "overdue" ? "متأخرة" : "معلقة"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">آخر المسجلين</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")}>عرض الكل</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {stats.recentUsers.map((u: any) => (
              <div key={u.user_id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{u.full_name || "بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(u.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
