import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getPartnerInvoices, updateInvoiceStatus, createPaymentLog } from "@/lib/accountingApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FileText, CheckCircle, Send, DollarSign, RefreshCw, Download } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const statusLabels: Record<string, string> = { pending: "قيد الانتظار", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-800" };
const periodLabels: Record<string, string> = { weekly: "أسبوعي", monthly: "شهري", yearly: "سنوي" };

const AdminInvoices = () => {
  const { user } = useAuth();
  const { sendPushNotification } = useNotifications();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [generating, setGenerating] = useState(false);
  const [generatePeriod, setGeneratePeriod] = useState("weekly");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getPartnerInvoices({ status: statusFilter });
    setInvoices(data || []);

    // Fetch partner names
    if (data && data.length > 0) {
      const ids = [...new Set(data.map((i: any) => i.partner_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      profs?.forEach((p: any) => { map[p.user_id] = p.full_name || "بدون اسم"; });
      setProfiles(map);
    }
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

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-partner-invoices", {
        body: { period_type: generatePeriod },
      });
      if (error) throw error;
      toast.success(`تم إنشاء ${data?.invoicesCreated || 0} فاتورة جديدة`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "فشل إنشاء الفواتير");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) return;
    const headers = ["رقم الفاتورة", "الشريك", "الفترة", "النوع", "المعاملات", "الإجمالي", "العمولة", "الصافي", "الاستحقاق", "الحالة"];
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      profiles[inv.partner_id] || inv.partner_id,
      `${inv.period_start} - ${inv.period_end}`,
      periodLabels[inv.period_type] || inv.period_type || "-",
      inv.total_transactions,
      inv.total_amount,
      inv.total_commission,
      inv.net_amount,
      inv.due_date,
      statusLabels[inv.status] || inv.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `invoices-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const totalPending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.total_commission), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + Number(i.total_commission), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_commission), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold">الفواتير</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={generatePeriod} onValueChange={setGeneratePeriod}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">أسبوعي</SelectItem>
              <SelectItem value="monthly">شهري</SelectItem>
              <SelectItem value="yearly">سنوي</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerateInvoices} disabled={generating} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
            توليد الفواتير
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> تصدير CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><FileText className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">إجمالي الفواتير</p><p className="text-2xl font-bold">{invoices.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-yellow-600" /><div><p className="text-sm text-muted-foreground">مستحقات معلقة</p><p className="text-2xl font-bold">{totalPending.toLocaleString()} ر.ي</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-red-600" /><div><p className="text-sm text-muted-foreground">مستحقات متأخرة</p><p className="text-2xl font-bold">{totalOverdue.toLocaleString()} ر.ي</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="w-8 h-8 text-green-600" /><div><p className="text-sm text-muted-foreground">إجمالي المدفوع</p><p className="text-2xl font-bold">{totalPaid.toLocaleString()} ر.ي</p></div></CardContent></Card>
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">الكل</SelectItem>
          <SelectItem value="pending">معلقة</SelectItem>
          <SelectItem value="paid">مدفوعة</SelectItem>
          <SelectItem value="overdue">متأخرة</SelectItem>
          <SelectItem value="cancelled">ملغاة</SelectItem>
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
                  <TableHead>الشريك</TableHead>
                  <TableHead>الفترة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المعاملات</TableHead>
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
                    <TableCell className="text-sm">{profiles[inv.partner_id] || "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(inv.period_start), "MM/dd")} - {format(new Date(inv.period_end), "MM/dd")}</TableCell>
                    <TableCell className="text-sm">{periodLabels[inv.period_type] || "—"}</TableCell>
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
                            <Button size="sm" variant="outline" title="تأكيد الدفع" onClick={() => { setPayDialog(inv); setPayAmount(String(inv.total_commission)); }}>
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" title="إرسال تذكير" onClick={() => handleSendReminder(inv)}>
                              <Send className="w-3 h-3" />
                            </Button>
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
