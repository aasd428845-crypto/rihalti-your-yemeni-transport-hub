import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { getPaymentTransactions, updatePaymentTransaction } from "@/lib/paymentApi";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle, XCircle, Eye, Loader2, CreditCard, Image } from "lucide-react";

const statusLabels: Record<string, string> = { pending: "قيد المراجعة", verified: "مؤكد", rejected: "مرفوض", completed: "مكتمل" };
const statusColors: Record<string, string> = { pending: "bg-yellow-100 text-yellow-800", verified: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800", completed: "bg-blue-100 text-blue-800" };
const entityLabels: Record<string, string> = { booking: "حجز", shipment: "شحن", delivery: "توصيل", ride: "أجرة" };

const AdminPaymentReview = () => {
  const { user } = useAuth();
  const { sendPushNotification } = useNotifications();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPaymentTransactions({ status: statusFilter });
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleVerify = async (tx: any) => {
    if (!user) return;
    setProcessing(true);
    try {
      await updatePaymentTransaction(tx.id, {
        status: "verified",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      });

      // Update financial_transactions payment_status
      await supabase
        .from("financial_transactions")
        .update({ payment_status: "paid", paid_at: new Date().toISOString() } as any)
        .eq("reference_id", tx.related_entity_id);

      // Notify customer
      try {
        await sendPushNotification({
          userId: tx.user_id,
          title: "تم تأكيد الدفع ✅",
          body: `تم تأكيد حوالتك بمبلغ ${Number(tx.amount).toLocaleString()} ر.ي`,
          sound: "payment_success",
          data: { type: "payment_verified" },
        });
      } catch {}

      toast({ title: "تم التأكيد", description: "تم تأكيد الحوالة بنجاح" });
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user || !selectedTx) return;
    setProcessing(true);
    try {
      await updatePaymentTransaction(selectedTx.id, {
        status: "rejected",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        notes: rejectReason,
      });

      try {
        await sendPushNotification({
          userId: selectedTx.user_id,
          title: "تم رفض الحوالة ❌",
          body: rejectReason || "تم رفض حوالتك، يرجى التواصل مع الدعم",
          sound: "default",
          data: { type: "payment_rejected" },
        });
      } catch {}

      toast({ title: "تم الرفض", description: "تم رفض الحوالة" });
      setShowRejectDialog(false);
      setRejectReason("");
      setSelectedTx(null);
      fetchData();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          التحويلات البنكية
        </h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">قيد المراجعة</SelectItem>
            <SelectItem value="verified">مؤكد</SelectItem>
            <SelectItem value="rejected">مرفوض</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا توجد تحويلات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
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
                    <TableCell>
                      <Badge variant="outline">{entityLabels[tx.entity_type] || tx.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">{Number(tx.amount).toLocaleString()} ر.ي</TableCell>
                    <TableCell className="font-mono text-sm">{tx.transfer_reference || "-"}</TableCell>
                    <TableCell>
                      {tx.transfer_receipt_url ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImageUrl(tx.transfer_receipt_url);
                            setShowImageDialog(true);
                          }}
                        >
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
                      {format(new Date(tx.created_at), "yyyy/MM/dd HH:mm", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {tx.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleVerify(tx)}
                            disabled={processing}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedTx(tx);
                              setShowRejectDialog(true);
                            }}
                            disabled={processing}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {tx.status === "rejected" && tx.notes && (
                        <span className="text-xs text-red-500">{tx.notes}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>رفض الحوالة</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="سبب الرفض..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>صورة الحوالة</DialogTitle>
          </DialogHeader>
          <img src={imageUrl} alt="صورة الحوالة" className="w-full rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentReview;
