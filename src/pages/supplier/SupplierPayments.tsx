import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { getPaymentTransactions, updatePaymentTransaction } from "@/lib/paymentApi";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle, Loader2, CreditCard, Image } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "قيد المراجعة", verified: "مؤكد", rejected: "مرفوض", completed: "مكتمل" };
const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", verified: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", completed: "bg-blue-100 text-blue-800" };

const SupplierPayments = () => {
  const { user } = useAuth();
  const { sendPushNotification } = useNotifications();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getPaymentTransactions({ partnerId: user.id });
      setTransactions(data);
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

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <CreditCard className="w-6 h-6" />
        المدفوعات المستلمة
      </h2>

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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tx.status] || ""}`}>
                        {statusLabels[tx.status] || tx.status}
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

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>صورة الحوالة</DialogTitle></DialogHeader>
          <img src={imageUrl} alt="صورة الحوالة" className="w-full rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPayments;
