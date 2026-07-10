import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, X, User, Phone, DollarSign, Hash, Calendar, Wallet, Image } from "lucide-react";

export const statusLabels: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  verified: "مراجعة المنصة",
  paid: "مدفوع",
  rejected: "مرفوض",
};

export const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  verified: "bg-blue-100 text-blue-800 border-blue-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

interface Props {
  selectedTx: any | null;
  showRejectDialog: boolean;
  rejectReason: string;
  processing: boolean;
  onClose: () => void;
  onApprove: (tx: any) => void;
  onReject: () => void;
  setShowRejectDialog: (v: boolean) => void;
  setRejectReason: (v: string) => void;
}

export const PaymentReviewDialog = ({
  selectedTx,
  showRejectDialog,
  rejectReason,
  processing,
  onClose,
  onApprove,
  onReject,
  setShowRejectDialog,
  setRejectReason,
}: Props) => {
  if (!selectedTx) return null;

  return (
    <>
      {/* ── Transaction Detail Modal ── */}
      {!showRejectDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-card rounded-t-2xl">
              <h2 className="text-lg font-bold">تفاصيل المعاملة</h2>
              <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {selectedTx.transfer_receipt_url && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Image className="w-4 h-4" /> صورة الحوالة</p>
                  <img
                    src={selectedTx.transfer_receipt_url}
                    alt="الحوالة"
                    className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity border"
                    onClick={() => window.open(selectedTx.transfer_receipt_url, "_blank")}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "العميل", value: selectedTx.profiles?.full_name || "—", icon: User },
                  { label: "رقم الهاتف", value: selectedTx.profiles?.phone || "—", icon: Phone },
                  { label: "المبلغ", value: `${Number(selectedTx.amount).toLocaleString()} ر.ي`, icon: DollarSign },
                  { label: "رقم الحوالة", value: selectedTx.transfer_reference || "—", icon: Hash },
                  { label: "التاريخ", value: new Date(selectedTx.created_at).toLocaleDateString("ar-YE"), icon: Calendar },
                  { label: "طريقة الدفع", value: selectedTx.payment_method === "bank_transfer" ? "تحويل بنكي" : selectedTx.payment_method === "cash" ? "نقداً" : (selectedTx.payment_method || "—"), icon: Wallet },
                ].map(({ label, value, icon: Icon }, i) => (
                  <div key={i} className="bg-muted/40 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><Icon className="w-3.5 h-3.5" />{label}</p>
                    <p className="font-semibold text-sm">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl">
                <span className="text-sm text-muted-foreground">الحالة:</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[selectedTx.status] || "bg-muted"}`}>
                  {statusLabels[selectedTx.status] || selectedTx.status}
                </span>
              </div>
              {selectedTx.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => onApprove(selectedTx)} disabled={processing}>
                    <CheckCircle className="w-4 h-4" />موافقة
                  </Button>
                  <Button variant="outline" className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 gap-2" onClick={() => setShowRejectDialog(true)} disabled={processing}>
                    <XCircle className="w-4 h-4" />رفض
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Dialog ── */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-card border rounded-2xl w-full max-w-sm p-5 shadow-2xl" dir="rtl">
            <h3 className="text-lg font-bold mb-3">سبب الرفض</h3>
            <Textarea
              placeholder="اكتب سبب رفض الدفعة..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <Button className="flex-1 bg-destructive hover:bg-destructive/90" onClick={onReject} disabled={processing}>
                <XCircle className="w-4 h-4 ml-1" />تأكيد الرفض
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setShowRejectDialog(false); setRejectReason(""); }}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
