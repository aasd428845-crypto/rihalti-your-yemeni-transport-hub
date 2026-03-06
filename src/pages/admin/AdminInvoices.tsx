import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getPartnerInvoices, updateInvoiceStatus, createPaymentLog } from "@/lib/accountingApi";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, CheckCircle, Send, DollarSign } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const statusLabels: Record<string, string> = { pending: "قيد الانتظار", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-800" };

const AdminInvoices = () => {
  const { user } = useAuth();
  const { sendPushNotification } = useNotifications();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getPartnerInvoices({ status: statusFilter });
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleMarkPaid = async () => {
    if (!payDialog || !user) return;
    await createPaymentLog({
      invoice_id: payDialog.id,
      amount_paid: Number(payAmount) || Number(payDialog.total_commission),
      payment_method: payMethod,
      received_by: user.id,
    });
    await updateInvoiceStatus(payDialog.id, "paid", new Date().toISOString());
    toast.success("تم تسجيل الدفع بنجاح");
    setPayDialog(null);
    fetchData();
  };

  const handleSendReminder = async (inv: any) => {
    try {
      await sendPushNotification({
        userId: inv.partner_id,
        title: "تذكير بفاتورة مستحقة 📄",
        body: `فاتورتك رقم ${inv.invoice_number} بمبلغ ${Number(inv.total_commission).toLocaleString()} ر.ي مستحقة في ${format(new Date(inv.due_date), "yyyy/MM/dd")}`,
        data: { type: "invoice", invoiceId: inv.id },
      });
      toast.success("تم إرسال التذكير");
    } catch { toast.error("فشل إرسال التذكير"); }
  };

  const totalPending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.total_commission), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i.total_commission), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold">الفواتير</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><FileText className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">إجمالي الفواتير</p><p className="text-2xl font-bold">{invoices.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-yellow-600" /><div><p className="text-sm text-muted-foreground">مستحقات معلقة</p><p className="text-2xl font-bold">{totalPending.toLocaleString()} ر.ي</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-red-600" /><div><p className="text-sm text-muted-foreground">مستحقات متأخرة</p><p className="text-2xl font-bold">{totalOverdue.toLocaleString()} ر.ي</p></div></CardContent></Card>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          <SelectItem value="pending">معلقة</SelectItem>
          <SelectItem value="paid">مدفوعة</SelectItem>
          <SelectItem value="overdue">متأخرة</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : invoices.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا توجد فواتير</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>الفترة</TableHead>
                  <TableHead>عدد المعاملات</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>العمولة</TableHead>
                  <TableHead>الصافي</TableHead>
                  <TableHead>الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{format(new Date(inv.period_start), "MM/dd")} - {format(new Date(inv.period_end), "MM/dd")}</TableCell>
                    <TableCell>{inv.total_transactions}</TableCell>
                    <TableCell>{Number(inv.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-blue-600">{Number(inv.total_commission).toLocaleString()}</TableCell>
                    <TableCell className="text-green-600">{Number(inv.net_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{format(new Date(inv.due_date), "yyyy/MM/dd")}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[inv.status]}`}>{statusLabels[inv.status]}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {inv.status !== "paid" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { setPayDialog(inv); setPayAmount(String(inv.total_commission)); }}><CheckCircle className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleSendReminder(inv)}><Send className="w-3 h-3" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تسجيل دفعة - {payDialog?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>المبلغ</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleMarkPaid}>تأكيد الدفع</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInvoices;
