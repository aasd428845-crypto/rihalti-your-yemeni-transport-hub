import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getFinancialTransactions } from "@/lib/accountingApi";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { DollarSign } from "lucide-react";

const typeLabels: Record<string, string> = { booking: "حجز", shipment: "شحن", delivery: "توصيل", ride: "أجرة" };
const statusLabels: Record<string, string> = { pending: "قيد الانتظار", paid: "مدفوع", overdue: "متأخر", cancelled: "ملغي" };
const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-800" };

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getFinancialTransactions({ type: typeFilter, status: statusFilter });
    setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [typeFilter, statusFilter]);

  const totalAmount = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalCommission = transactions.reduce((s, t) => s + Number(t.platform_commission), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold">المعاملات المالية</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">إجمالي المعاملات</p><p className="text-2xl font-bold">{transactions.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-green-600" /><div><p className="text-sm text-muted-foreground">إجمالي المبالغ</p><p className="text-2xl font-bold">{totalAmount.toLocaleString()} ر.ي</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-blue-600" /><div><p className="text-sm text-muted-foreground">إجمالي العمولة</p><p className="text-2xl font-bold">{totalCommission.toLocaleString()} ر.ي</p></div></CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="booking">حجز</SelectItem>
            <SelectItem value="shipment">شحن</SelectItem>
            <SelectItem value="delivery">توصيل</SelectItem>
            <SelectItem value="ride">أجرة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="paid">مدفوع</SelectItem>
            <SelectItem value="overdue">متأخر</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا توجد معاملات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>العمولة</TableHead>
                  <TableHead>صافي الشريك</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><Badge variant="outline">{typeLabels[t.transaction_type] || t.transaction_type}</Badge></TableCell>
                    <TableCell className="font-medium">{Number(t.amount).toLocaleString()} ر.ي</TableCell>
                    <TableCell className="text-blue-600">{Number(t.platform_commission).toLocaleString()} ر.ي</TableCell>
                    <TableCell className="text-green-600">{Number(t.partner_earning).toLocaleString()} ر.ي</TableCell>
                    <TableCell>{t.payment_method === "cash" ? "نقدي" : t.payment_method === "later" ? "مؤجل" : t.payment_method}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[t.payment_status] || ""}`}>{statusLabels[t.payment_status] || t.payment_status}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(t.created_at), "yyyy/MM/dd", { locale: ar })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTransactions;
