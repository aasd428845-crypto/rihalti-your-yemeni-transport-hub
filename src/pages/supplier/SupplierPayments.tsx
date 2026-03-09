import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { getPaymentTransactions, updatePaymentTransaction } from "@/lib/paymentApi";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle, Loader2, CreditCard, Image, Receipt, Upload, FileText, DollarSign } from "lucide-react";

const payStatusLabels: Record<string, string> = { pending: "قيد المراجعة", verified: "مؤكد", rejected: "مرفوض", completed: "مكتمل" };
const payStatusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", verified: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", completed: "bg-blue-100 text-blue-800" };
const invStatusLabels: Record<string, string> = { pending: "معلقة", paid: "مدفوعة", overdue: "متأخرة", cancelled: "ملغاة" };
const invStatusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", paid: "bg-green-100 text-green-800", overdue: "bg-red-100 text-red-800", cancelled: "bg-gray-100 text-gray-800" };

const SupplierPayments = () => {
  const { user } = useAuth();
  const { sendPushNotification } = useNotifications();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  // Pay invoice dialog
  const [payInvoice, setPayInvoice] = useState<any>(null);
  const [transferRef, setTransferRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [payData, invRes, accRes] = await Promise.all([
        getPaymentTransactions({ partnerId: user.id }),
        supabase.from("partner_invoices").select("*").eq("partner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("payment_accounts").select("*").eq("is_active", true),
      ]);
      setTransactions(payData);
      setInvoices(invRes.data || []);
      setPlatformAccounts(accRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleComplete = async (tx: any) => {
    if (!user) return;
    setProcessing(true);
    try {
      await updatePaymentTransaction(tx.id, {
        status: "completed",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      });
      try {
        await sendPushNotification({
          userId: tx.user_id,
          title: "تم تأكيد استلام الدفع ✅",
          body: `أكد الشريك استلام مبلغ ${Number(tx.amount).toLocaleString()} ر.ي`,
          data: { type: "payment_completed" },
        });
      } catch {}
      toast({ title: "تم", description: "تم تأكيد استلام الدفع" });
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!user || !payInvoice) return;
    setUploading(true);
    try {
      let receiptUrl = "";
      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop();
        const path = `${user.id}/${payInvoice.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(path, receiptFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("payment-receipts").getPublicUrl(path);
        receiptUrl = urlData.publicUrl;
      }

      await supabase.from("payment_transactions").insert({
        user_id: user.id,
        partner_id: user.id,
        entity_type: "invoice",
        related_entity_id: payInvoice.id,
        amount: Number(payInvoice.total_commission),
        payment_method: "bank_transfer",
        transfer_reference: transferRef,
        transfer_receipt_url: receiptUrl,
        status: "pending",
      });

      // Notify admin
      try {
        await sendPushNotification({
          targetRole: "admin",
          title: "حوالة دفع جديدة 💰",
          body: `قام شريك بتحميل حوالة لفاتورة ${payInvoice.invoice_number}`,
          data: { type: "payment_receipt" },
        });
      } catch {}

      toast({ title: "تم", description: "تم إرسال الحوالة بنجاح، سيتم مراجعتها" });
      setPayInvoice(null);
      setTransferRef("");
      setReceiptFile(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const pendingInvoices = invoices.filter(i => i.status === "pending" || i.status === "overdue");
  const totalDue = pendingInvoices.reduce((s, i) => s + Number(i.total_commission), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <CreditCard className="w-6 h-6" />
        المدفوعات والفواتير
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Receipt className="w-8 h-8 text-primary" /><div><p className="text-sm text-muted-foreground">إجمالي الفواتير</p><p className="text-2xl font-bold">{invoices.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="w-8 h-8 text-red-600" /><div><p className="text-sm text-muted-foreground">مستحقات غير مدفوعة</p><p className="text-2xl font-bold">{totalDue.toLocaleString()} ر.ي</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><FileText className="w-8 h-8 text-green-600" /><div><p className="text-sm text-muted-foreground">حوالات مقدمة</p><p className="text-2xl font-bold">{transactions.length}</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices" className="gap-1"><Receipt className="h-4 w-4" /> الفواتير</TabsTrigger>
          <TabsTrigger value="payments" className="gap-1"><CreditCard className="h-4 w-4" /> المدفوعات</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : invoices.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">لا توجد فواتير</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>الفترة</TableHead>
                      <TableHead>العمولة المستحقة</TableHead>
                      <TableHead>الاستحقاق</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm">{inv.period_start} → {inv.period_end}</TableCell>
                        <TableCell className="font-bold">{Number(inv.total_commission).toLocaleString()} ر.ي</TableCell>
                        <TableCell className="text-sm">{inv.due_date}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${invStatusColors[inv.status]}`}>
                            {invStatusLabels[inv.status] || inv.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(inv.status === "pending" || inv.status === "overdue") && (
                            <Button size="sm" onClick={() => { setPayInvoice(inv); setTransferRef(""); setReceiptFile(null); }} className="gap-1">
                              <Upload className="w-3 h-3" /> دفع
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : transactions.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">لا توجد مدفوعات</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>رقم الحوالة</TableHead>
                      <TableHead>الصورة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-bold">{Number(tx.amount).toLocaleString()} ر.ي</TableCell>
                        <TableCell className="font-mono text-sm">{tx.transfer_reference || "-"}</TableCell>
                        <TableCell>
                          {tx.transfer_receipt_url ? (
                            <Button variant="ghost" size="sm" onClick={() => { setImageUrl(tx.transfer_receipt_url); setShowImageDialog(true); }}>
                              <Image className="w-4 h-4" />
                            </Button>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${payStatusColors[tx.status] || ""}`}>
                            {payStatusLabels[tx.status] || tx.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(tx.created_at), "yyyy/MM/dd", { locale: ar })}
                        </TableCell>
                        <TableCell>
                          {tx.status === "verified" && (
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleComplete(tx)} disabled={processing}>
                              <CheckCircle className="w-4 h-4 ml-1" /> تأكيد الاستلام
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>صورة الحوالة</DialogTitle></DialogHeader>
          <img src={imageUrl} alt="صورة الحوالة" className="w-full rounded-lg" />
        </DialogContent>
      </Dialog>

      {/* Pay Invoice Dialog */}
      <Dialog open={!!payInvoice} onOpenChange={() => setPayInvoice(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>دفع فاتورة {payInvoice?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">المبلغ المستحق:</span> <strong>{Number(payInvoice?.total_commission || 0).toLocaleString()} ر.ي</strong></p>
              <p className="text-sm"><span className="text-muted-foreground">تاريخ الاستحقاق:</span> <strong>{payInvoice?.due_date}</strong></p>
            </div>

            {platformAccounts.length > 0 && (
              <div>
                <Label className="mb-2 block">حسابات المنصة البنكية</Label>
                <div className="space-y-2">
                  {platformAccounts.map((acc) => (
                    <div key={acc.id} className="p-3 border rounded-lg text-sm space-y-1">
                      <p className="font-medium">{acc.bank_name}</p>
                      <p className="text-muted-foreground">صاحب الحساب: {acc.account_name}</p>
                      <p className="text-muted-foreground">رقم الحساب: {acc.account_number}</p>
                      {acc.iban && <p className="text-muted-foreground">IBAN: {acc.iban}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>رقم الحوالة / المرجع</Label>
              <Input value={transferRef} onChange={e => setTransferRef(e.target.value)} placeholder="أدخل رقم الحوالة" />
            </div>
            <div>
              <Label>صورة الحوالة</Label>
              <Input type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full" onClick={handlePayInvoice} disabled={uploading || !transferRef}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Upload className="w-4 h-4 ml-2" />}
              إرسال الحوالة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPayments;
