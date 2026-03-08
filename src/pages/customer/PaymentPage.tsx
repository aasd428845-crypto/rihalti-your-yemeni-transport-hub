import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import {
  getPlatformAccounts,
  createPaymentTransaction,
  uploadPaymentReceipt,
  getEntityDetails,
} from "@/lib/paymentApi";
import { ArrowRight, Upload, CreditCard, Building2, CheckCircle, Loader2 } from "lucide-react";
import BackButton from "@/components/common/BackButton";

const entityLabels: Record<string, string> = {
  booking: "حجز رحلة",
  shipment: "شحنة",
  delivery: "طلب توصيل",
  ride: "رحلة أجرة",
};

const PaymentPage = () => {
  const { entityType, entityId } = useParams<{ entityType: string; entityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendPushNotification } = useNotifications();

  const [entity, setEntity] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transferRef, setTransferRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entityType || !entityId) return;
    const load = async () => {
      try {
        const [entityData, accs] = await Promise.all([
          getEntityDetails(entityType, entityId),
          getPlatformAccounts(),
        ]);
        setEntity(entityData);
        setAccounts(accs);
      } catch (err) {
        console.error(err);
        toast({ title: "خطأ", description: "تعذر تحميل البيانات", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entityType, entityId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const getAmount = () => {
    if (!entity) return 0;
    return Number(entity.total_amount || entity.total || entity.agreed_price || entity.amount || 0);
  };

  const handleSubmit = async () => {
    if (!user || !entityType || !entityId) return;
    if (!transferRef.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال رقم الحوالة", variant: "destructive" });
      return;
    }
    if (!receiptFile) {
      toast({ title: "خطأ", description: "يرجى رفع صورة الحوالة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const receiptUrl = await uploadPaymentReceipt(user.id, receiptFile);

      await createPaymentTransaction({
        user_id: user.id,
        related_entity_id: entityId,
        entity_type: entityType,
        amount: getAmount(),
        payment_method: "bank_transfer",
        transfer_receipt_url: receiptUrl,
        transfer_reference: transferRef.trim(),
      });

      // Notify admin
      try {
        await sendPushNotification({
          targetRole: "admin",
          title: "تحويل بنكي جديد 🏦",
          body: `عميل قام برفع حوالة بمبلغ ${getAmount().toLocaleString()} ر.ي - ${entityLabels[entityType] || entityType}`,
          data: { type: "payment", entityType, entityId },
        });
      } catch {}

      toast({ title: "تم بنجاح", description: "تم إرسال طلب الدفع وسيتم مراجعته قريباً" });
      navigate("/payment-success");
    } catch (err: any) {
      console.error(err);
      toast({ title: "خطأ", description: err.message || "حدث خطأ أثناء إرسال الطلب", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const amount = getAmount();

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />

        <div className="text-center space-y-2">
          <CreditCard className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">إتمام الدفع</h1>
          <p className="text-muted-foreground">قم بتحويل المبلغ ثم ارفع صورة الحوالة</p>
        </div>

        {/* Transaction Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ملخص المعاملة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">نوع الخدمة</span>
              <Badge variant="outline">{entityLabels[entityType || ""] || entityType}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">المبلغ المطلوب</span>
              <span className="text-xl font-bold text-primary">{amount.toLocaleString()} ر.ي</span>
            </div>
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              حسابات الدفع المتاحة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">لا توجد حسابات متاحة حالياً</p>
            ) : (
              accounts.map((acc: any) => (
                <div key={acc.id} className="border rounded-lg p-4 space-y-2 bg-background">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-semibold">{acc.bank_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">اسم الحساب: </span>
                      <span className="font-medium">{acc.account_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">رقم الحساب: </span>
                      <span className="font-medium font-mono">{acc.account_number}</span>
                    </div>
                    {acc.iban && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">IBAN: </span>
                        <span className="font-medium font-mono">{acc.iban}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تأكيد الدفع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transferRef">رقم الحوالة *</Label>
              <Input
                id="transferRef"
                placeholder="أدخل رقم الحوالة أو المرجع"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>صورة الحوالة *</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("receipt-file")?.click()}
              >
                {previewUrl ? (
                  <div className="space-y-2">
                    <img src={previewUrl} alt="صورة الحوالة" className="max-h-48 mx-auto rounded-lg" />
                    <p className="text-sm text-muted-foreground">{receiptFile?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">اضغط لرفع صورة الحوالة</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, PDF - حد أقصى 5MB</p>
                  </div>
                )}
              </div>
              <input
                id="receipt-file"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || !transferRef.trim() || !receiptFile}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <CheckCircle className="w-4 h-4 ml-2" />
              )}
              {submitting ? "جارٍ الإرسال..." : "تأكيد الدفع"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentPage;
