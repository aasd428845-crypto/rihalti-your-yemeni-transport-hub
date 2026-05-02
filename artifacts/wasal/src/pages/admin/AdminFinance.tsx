import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Percent, CreditCard, CheckCircle } from "lucide-react";
import StatCard from "@/components/admin/dashboard/StatsCards";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { getFinancialTransactions } from "@/lib/accountingApi";
import { getPayouts, updatePayoutStatus, createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";
import type { Payout } from "@/types/admin.types";
import { supabase } from "@/integrations/supabase/client";

const AdminFinance = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const [txRes, payRes, settingsRes] = await Promise.all([
      getFinancialTransactions({ type: filterType, status: filterStatus }),
      getPayouts(),
      supabase.from("accounting_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setTransactions(txRes.data || []);
    setPayouts((payRes.data || []) as Payout[]);
    setCommissions(settingsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterType, filterStatus]);

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const platformEarnings = transactions.reduce((s, t) => s + Number(t.platform_commission || 0), 0);
  const pendingPayouts = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  const handlePayoutApproval = async (id: string, status: string) => {
    const { error } = await updatePayoutStatus(id, status);
    if (error) { toast.error("فشل التحديث"); return; }
    toast.success("تم التحديث بنجاح");
    if (user) createAuditLog(user.id, `تحديث طلب دفع: ${status}`, "payout", id);
    fetchData();
  };

  const typeLabels: Record<string, string> = { booking: "حجز", shipment: "شحن", delivery: "توصيل", ride: "أجرة" };
  const statusLabels: Record<string, string> = { pending: "قيد الانتظار", paid: "مدفوع", overdue: "متأخر", cancelled: "ملغي" };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الإدارة المالية</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الإيرادات" value={`${totalRevenue.toLocaleString()} ر.ي`} icon={DollarSign} />
        <StatCard title="أرباح المنصة" value={`${platformEarnings.toLocaleString()} ر.ي`} icon={TrendingUp} />
        <StatCard title="مستحقات الشركاء" value={`${pendingPayouts.toLocaleString()} ر.ي`} icon={CreditCard} />
        <StatCard title="عمولة الحجوزات" value={`${commissions?.global_commission_booking || 10}%`} icon={Percent} />
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">المعاملات</TabsTrigger>
          <TabsTrigger value="payouts">طلبات الدفع</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4 space-y-4">
          <div className="flex gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="booking">حجز</SelectItem>
                <SelectItem value="shipment">طرد</SelectItem>
                <SelectItem value="delivery">توصيل</SelectItem>
                <SelectItem value="ride">أجرة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="overdue">متأخر</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>عمولة المنصة</TableHead>
                    <TableHead>أرباح الشريك</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد معاملات</TableCell></TableRow>
                  ) : transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{typeLabels[tx.transaction_type] || tx.transaction_type}</TableCell>
                      <TableCell>{Number(tx.amount).toLocaleString()} ر.ي</TableCell>
                      <TableCell>{Number(tx.platform_commission).toLocaleString()} ر.ي</TableCell>
                      <TableCell>{Number(tx.partner_earning).toLocaleString()} ر.ي</TableCell>
                      <TableCell className="text-xs">{tx.payment_method === "cash" ? "نقد" : "تحويل"}</TableCell>
                      <TableCell><StatusBadge status={tx.payment_status || "pending"} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("ar-YE")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع الشريك</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد طلبات دفع</TableCell></TableRow>
                  ) : payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.partner_role === "supplier" ? "صاحب مكتب" : p.partner_role === "driver" ? "سائق" : "شركة توصيل"}</TableCell>
                      <TableCell>{Number(p.amount).toLocaleString()} ر.ي</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-YE")}</TableCell>
                      <TableCell>
                        {p.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handlePayoutApproval(p.id, "approved")}><CheckCircle className="w-3 h-3 ml-1" />موافقة</Button>
                            <Button size="sm" variant="outline" onClick={() => handlePayoutApproval(p.id, "paid")}>تم الصرف</Button>
                          </div>
                        )}
                        {p.status === "approved" && (
                          <Button size="sm" variant="outline" onClick={() => handlePayoutApproval(p.id, "paid")}>تأكيد الصرف</Button>
                        )}
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

export default AdminFinance;
