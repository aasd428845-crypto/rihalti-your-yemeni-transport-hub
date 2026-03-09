import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import {
  getPlatformAccounts,
  getPartnerAccounts,
  createPaymentTransaction,
  uploadPaymentReceipt,
  getEntityDetails,
} from "@/lib/paymentApi";
import { getPartnerSettings, PartnerSettings } from "@/lib/partnerSettingsApi";
import { Upload, CreditCard, Building2, CheckCircle, Loader2, Banknote } from "lucide-react";
import BackButton from "@/components/common/BackButton";

const entityLabels: Record<string, string> = {
  booking: "حجز رحلة",
  shipment: "طرد",
  delivery: "طلب توصيل",
  ride: "رحلة أجرة",
};

const PaymentPage = () => {
  const { entityType, entityId } = useParams<{ entityType: string; entityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sendPushNotification } = useNotifications();

  const [entity, setEntity] = useState<any>(null);
  const [platformAccounts, setPlatformAccounts] = useState<any[]>([]);
  const [partnerAccounts, setPartnerAccounts] = useState<any[]>([]);
  const [partnerSettings, setPartnerSettings] = useState<PartnerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [transferRef, setTransferRef] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entityType || !entityId) return;
    const load = async () => {
      try {
        const entityData = await getEntityDetails(entityType, entityId) as any;
        setEntity(entityData);

        const platAccs = await getPlatformAccounts();
        setPlatformAccounts(platAccs);

        // Determine partner ID from entity
        const partnerId = entityData?.supplier_id || entityData?.delivery_company_id || entityData?.driver_id;
        if (partnerId) {
          const [pSettings, pAccs] = await Promise.all([
            getPartnerSettings(partnerId),
            getPartnerAccounts(partnerId),
          ]);
          setPartnerSettings(pSettings);
          setPartnerAccounts(pAccs);
        }
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
    return Number(entity.final_price || entity.total_amount || entity.total || entity.agreed_price || entity.amount || 0);
  };

  // Determine available payment methods
  const getAvailableMethods = () => {
    const methods: { value: string; label: string; description: string }[] = [];

    // Platform bank transfer is always available
    if (platformAccounts.length > 0) {
      methods.push({
        value: "platform_transfer",
        label: "تحويل بنكي إلى المنصة",
        description: "حوّل المبلغ إلى حساب المنصة",
      });
    }

    // Direct partner transfer if allowed
    if (partnerSettings?.allow_direct_payment && partnerAccounts.length > 0) {
      methods.push({
        value: "partner_transfer",
        label: "تحويل بنكي إلى الشريك",
        description: "حوّل المبلغ مباشرة إلى حساب مقدم الخدمة",
      });
    }

    // Cash on delivery/ride
    const isRide = entityType === "ride";
    if (isRide) {
      if (partnerSettings?.cash_on_ride_enabled !== false) {
        methods.push({
          value: "cash",
          label: "نقداً عند الركوب",
          description: "ادفع نقداً للسائق مباشرة",
        });
      }
    } else {
      if (partnerSettings?.cash_on_delivery_enabled !== false) {
        methods.push({
          value: "cash",
          label: "نقداً عند الاستلام",
          description: "ادفع نقداً عند استلام الطلب",
        });
      }
    }

    return methods;
  };

  const availableMethods = getAvailableMethods();
  const isBankTransfer = paymentMethod === "platform_transfer" || paymentMethod === "partner_transfer";
  const displayedAccounts = paymentMethod === "partner_transfer" ? partnerAccounts : platformAccounts;

  const handleSubmit = async () => {
    if (!user || !entityType || !entityId || !paymentMethod) return;

    if (isBankTransfer) {
      if (!transferRef.trim()) {
        toast({ title: "خطأ", description: "يرجى إدخال رقم الحوالة", variant: "destructive" });
        return;
      }
      if (!receiptFile) {
        toast({ title: "خطأ", description: "يرجى رفع صورة الحوالة", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    try {
      const partnerId = entity?.supplier_id || entity?.delivery_company_id || entity?.driver_id;

      if (isBankTransfer) {
        const receiptUrl = await uploadPaymentReceipt(user.id, receiptFile!);
        await createPaymentTransaction({
          user_id: user.id,
          related_entity_id: entityId,
          entity_type: entityType,
          amount: getAmount(),
          payment_method: "bank_transfer",
          transfer_receipt_url: receiptUrl,
          transfer_reference: transferRef.trim(),
          partner_id: paymentMethod === "partner_transfer" ? partnerId : undefined,
        });

        try {
          await sendPushNotification({
            targetRole: "admin",
            title: "تحويل بنكي جديد 🏦",
            body: `عميل قام برفع حوالة بمبلغ ${getAmount().toLocaleString()} ر.ي - ${entityLabels[entityType] || entityType}`,
            data: { type: "payment", entityType, entityId },
          });
          if (paymentMethod === "partner_transfer" && partnerId) {
            await sendPushNotification({
              userId: partnerId,
              title: "حوالة بنكية جديدة 🏦",
              body: `عميل حوّل مبلغ ${getAmount().toLocaleString()} ر.ي إلى حسابك`,
              data: { type: "payment_direct" },
            });
          }
        } catch {}

        toast({ title: "تم بنجاح", description: "تم إرسال طلب الدفع وسيتم مراجعته قريباً" });
        navigate("/payment-success");
      } else {
        // Cash payment - just create transaction with cash method
        await createPaymentTransaction({
          user_id: user.id,
          related_entity_id: entityId,
          entity_type: entityType,
          amount: getAmount(),
          payment_method: "cash",
          partner_id: partnerId,
        });

        toast({ title: "تم بنجاح", description: "تم تأكيد الدفع نقداً عند الاستلام" });
        navigate("/payment-success");
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "خطأ", description: err.message || "حدث خطأ", variant: "destructive" });
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
          <p className="text-muted-foreground">اختر طريقة الدفع المناسبة</p>
        </div>

        {/* Transaction Summary */}
        <Card>
          <CardHeader><CardTitle className="text-lg">ملخص المعاملة</CardTitle></CardHeader>
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

        {/* Payment Method Selection */}
        <Card>
          <CardHeader><CardTitle className="text-lg">طريقة الدفع</CardTitle></CardHeader>
          <CardContent>
            {availableMethods.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">لا توجد طرق دفع متاحة حالياً</p>
            ) : (
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {availableMethods.map((m) => (
                  <div key={m.value} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${paymentMethod === m.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <RadioGroupItem value={m.value} id={m.value} />
                    <Label htmlFor={m.value} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {m.value === "cash" ? <Banknote className="w-4 h-4 text-green-600" /> : <Building2 className="w-4 h-4 text-primary" />}
                        <span className="font-medium">{m.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Bank Accounts (shown for transfer methods) */}
        {isBankTransfer && displayedAccounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {paymentMethod === "partner_transfer" ? "حسابات الشريك" : "حسابات المنصة"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {displayedAccounts.map((acc: any) => (
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
              ))}
            </CardContent>
          </Card>
        )}

        {/* Upload Form (shown for transfer methods) */}
        {isBankTransfer && (
          <Card>
            <CardHeader><CardTitle className="text-lg">تأكيد التحويل</CardTitle></CardHeader>
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
                <input id="receipt-file" type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {paymentMethod && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || (isBankTransfer && (!transferRef.trim() || !receiptFile))}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <CheckCircle className="w-4 h-4 ml-2" />
            )}
            {submitting ? "جارٍ الإرسال..." : isBankTransfer ? "تأكيد التحويل" : "تأكيد الدفع نقداً"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
