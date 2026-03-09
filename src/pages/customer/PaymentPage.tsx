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
  getPlatformBankAccounts,
  getPartnerAccounts,
  createPaymentTransaction,
  createFinancialTransaction,
  uploadPaymentReceipt,
  getEntityDetails,
  getTripDetails,
  getSupplierProfile,
  getAccountingSettings,
  getCashOnDeliverySetting,
} from "@/lib/paymentApi";
import { getPartnerSettings, PartnerSettings } from "@/lib/partnerSettingsApi";
import { Upload, CreditCard, Building2, CheckCircle, Loader2, Banknote, MapPin, Calendar, Users, Bus } from "lucide-react";
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

  // Booking-specific state
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [supplierInfo, setSupplierInfo] = useState<any>(null);
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [cashEnabled, setCashEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (!entityType || !entityId) return;
    const load = async () => {
      try {
        const entityData = await getEntityDetails(entityType, entityId) as any;
        setEntity(entityData);

        // Fetch platform bank accounts
        const platAccs = await getPlatformBankAccounts();
        setPlatformAccounts(platAccs);

        // Fetch system-level cash setting
        const cashSetting = await getCashOnDeliverySetting();
        setCashEnabled(cashSetting);

        // Fetch accounting settings for commission
        const accSettings = await getAccountingSettings();
        if (accSettings) {
          const rateMap: Record<string, number> = {
            booking: accSettings.global_commission_booking,
            shipment: accSettings.global_commission_shipment,
            delivery: accSettings.global_commission_delivery,
            ride: accSettings.global_commission_ride,
          };
          setCommissionRate(rateMap[entityType] ?? 10);
        }

        // Determine partner ID
        let partnerId: string | null = null;

        if (entityType === "booking" && entityData?.trip_id) {
          // For bookings, get trip details to find supplier
          const trip = await getTripDetails(entityData.trip_id);
          setTripDetails(trip);
          partnerId = trip?.supplier_id;

          if (partnerId) {
            const profile = await getSupplierProfile(partnerId);
            setSupplierInfo(profile);
          }
        } else {
          partnerId = entityData?.supplier_id || entityData?.delivery_company_id || entityData?.driver_id;
        }

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

  const getPartnerId = () => {
    if (entityType === "booking" && tripDetails) return tripDetails.supplier_id;
    return entity?.supplier_id || entity?.delivery_company_id || entity?.driver_id;
  };

  // Determine available payment methods
  const getAvailableMethods = () => {
    const methods: { value: string; label: string; description: string }[] = [];

    // Platform bank transfer
    if (platformAccounts.length > 0) {
      methods.push({
        value: "platform_transfer",
        label: "تحويل بنكي إلى المنصة",
        description: "حوّل المبلغ إلى حساب المنصة البنكي",
      });
    }

    // Direct partner transfer if allowed
    if (partnerSettings?.allow_direct_payment && partnerAccounts.length > 0) {
      methods.push({
        value: "partner_transfer",
        label: entityType === "booking" ? "تحويل بنكي مباشر إلى صاحب المكتب" : "تحويل بنكي إلى الشريك",
        description: entityType === "booking" ? "حوّل المبلغ مباشرة إلى حساب صاحب المكتب" : "حوّل المبلغ مباشرة إلى حساب مقدم الخدمة",
      });
    }

    // Cash option - check both system-level and partner-level
    if (cashEnabled) {
      const isRide = entityType === "ride";
      const isBooking = entityType === "booking";

      if (isRide) {
        if (partnerSettings?.cash_on_ride_enabled !== false) {
          methods.push({
            value: "cash",
            label: "نقداً عند الركوب",
            description: "ادفع نقداً للسائق مباشرة",
          });
        }
      } else if (isBooking) {
        if (partnerSettings?.cash_on_delivery_enabled !== false) {
          methods.push({
            value: "cash",
            label: "نقداً عند الصعود",
            description: "ادفع نقداً عند صعود الحافلة",
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
      const partnerId = getPartnerId();
      const amount = getAmount();
      const commission = Math.floor(amount * commissionRate / 100);
      const partnerEarning = amount - commission;
      const payMethodDb = paymentMethod === "cash" ? "cash" : "bank_transfer";

      // 1. Create payment transaction
      let receiptUrl: string | undefined;
      if (isBankTransfer && receiptFile) {
        receiptUrl = await uploadPaymentReceipt(user.id, receiptFile);
      }

      const paymentTx = await createPaymentTransaction({
        user_id: user.id,
        related_entity_id: entityId,
        entity_type: entityType,
        amount,
        payment_method: payMethodDb,
        transfer_receipt_url: receiptUrl,
        transfer_reference: isBankTransfer ? transferRef.trim() : undefined,
        partner_id: paymentMethod === "partner_transfer" ? partnerId : undefined,
      });

      // 2. Create financial transaction
      if (partnerId) {
        await createFinancialTransaction({
          transaction_type: entityType,
          reference_id: entityId,
          customer_id: user.id,
          partner_id: partnerId,
          amount,
          platform_commission: commission,
          partner_earning: partnerEarning,
          payment_method: payMethodDb,
          payment_status: "pending",
          payment_transaction_id: (paymentTx as any)?.id,
          partner_name: supplierInfo?.full_name || supplierInfo?.company_name,
          partner_phone: supplierInfo?.phone,
        });
      }

      // 3. Send notifications
      if (isBankTransfer) {
        try {
          await sendPushNotification({
            targetRole: "admin",
            title: "تحويل بنكي جديد 🏦",
            body: `عميل قام برفع حوالة بمبلغ ${amount.toLocaleString()} ر.ي - ${entityLabels[entityType] || entityType}`,
            data: { type: "payment", entityType, entityId },
          });
          if (paymentMethod === "partner_transfer" && partnerId) {
            await sendPushNotification({
              userId: partnerId,
              title: "حوالة بنكية جديدة 🏦",
              body: `عميل حوّل مبلغ ${amount.toLocaleString()} ر.ي إلى حسابك`,
              data: { type: "payment_direct" },
            });
          }
        } catch {}
        toast({ title: "تم بنجاح", description: "تم إرسال طلب الدفع وسيتم مراجعته قريباً" });
      } else {
        toast({ title: "تم بنجاح", description: entityType === "booking" ? "تم تأكيد الدفع نقداً عند الصعود" : "تم تأكيد الدفع نقداً عند الاستلام" });
      }

      navigate("/payment-success");
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

            {/* Booking-specific details with trip info */}
            {entityType === "booking" && entity && (
              <>
                {tripDetails && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> من</span>
                      <span className="font-medium">{tripDetails.from_city}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> إلى</span>
                      <span className="font-medium">{tripDetails.to_city}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> موعد الانطلاق</span>
                      <span className="font-medium">{tripDetails.departure_time}</span>
                    </div>
                    {tripDetails.bus_company && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center gap-1"><Bus className="w-3 h-3" /> شركة النقل</span>
                        <span className="font-medium">{tripDetails.bus_company}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> عدد المقاعد</span>
                  <span className="font-medium">{entity.seat_count}</span>
                </div>
                {supplierInfo && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">صاحب المكتب</span>
                    <span className="font-medium">{supplierInfo.full_name || supplierInfo.company_name}</span>
                  </div>
                )}
              </>
            )}

            {/* Delivery details */}
            {entityType === "delivery" && entity && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">اسم العميل</span>
                  <span className="font-medium">{entity.customer_name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">العنوان</span>
                  <span className="font-medium text-xs max-w-[200px] truncate">{entity.customer_address}</span>
                </div>
              </>
            )}

            {/* Shipment details */}
            {entityType === "shipment" && entity && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">نوع الشحنة</span>
                <span className="font-medium">{entity.shipment_type}</span>
              </div>
            )}

            {/* Amount */}
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-muted-foreground font-medium">المبلغ المطلوب</span>
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
