import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import {
  getPlatformBankAccounts,
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
import { fetchSupplierBankAccounts } from "@/lib/customerApi";
import { Upload, CreditCard, Building2, CheckCircle, Loader2, Banknote, MapPin, Calendar, Users, Bus, StickyNote } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import { supabase } from "@/integrations/supabase/client";

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
  const [partnerSettings, setPartnerSettings] = useState<PartnerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  // Partner bank accounts (for partner_transfer)
  const [partnerBankAccounts, setPartnerBankAccounts] = useState<any[]>([]);
  // Platform bank accounts (fallback)
  const [platformAccounts, setPlatformAccounts] = useState<any[]>([]);

  // Transfer form fields
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState("");

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
            const trip = await getTripDetails(entityData.trip_id);
            setTripDetails(trip);
            partnerId = trip?.supplier_id;

            if (partnerId) {
              const profile = await getSupplierProfile(partnerId);
              // Remove phone from supplier info shown to customer (privacy)
              setSupplierInfo(profile ? { full_name: profile.full_name, company_name: profile.company_name } : null);
              // Fetch partner's bank accounts
              const banks = await fetchSupplierBankAccounts(partnerId);
              setPartnerBankAccounts(banks || []);
            }
          } else {
            partnerId = entityData?.supplier_id || entityData?.delivery_company_id || entityData?.driver_id;
            if (partnerId) {
              const banks = await fetchSupplierBankAccounts(partnerId);
              setPartnerBankAccounts(banks || []);
              // Fetch partner profile without phone
              const profile = await getSupplierProfile(partnerId);
              setSupplierInfo(profile ? { full_name: profile.full_name, company_name: profile.company_name } : null);
            }
          }

        // Fetch platform bank accounts as fallback
        const platAccs = await getPlatformBankAccounts();
        setPlatformAccounts(platAccs);

        if (partnerId) {
          const pSettings = await getPartnerSettings(partnerId);
          setPartnerSettings(pSettings);
        }

        // Pre-fill payer name from profile
        if (user) {
          const { data: prof } = await supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
          if (prof) {
            setPayerName(prof.full_name || "");
            setPayerPhone(prof.phone || "");
          }
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

    const isRide = entityType === "ride";
    const isBooking = entityType === "booking";

    // Cash option
    if (cashEnabled) {
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

    // Partner bank transfer (partner's own accounts)
    if (partnerBankAccounts.length > 0) {
      methods.push({
        value: "partner_transfer",
        label: isBooking ? "تحويل إلى حساب صاحب المكتب" : "تحويل بنكي إلى الشريك",
        description: isBooking ? "حوّل المبلغ إلى الحساب البنكي لصاحب المكتب" : "حوّل المبلغ مباشرة إلى حساب مقدم الخدمة",
      });
    }

    // Platform bank transfer (fallback if no partner accounts)
    if (platformAccounts.length > 0 && partnerBankAccounts.length === 0) {
      methods.push({
        value: "platform_transfer",
        label: "تحويل بنكي إلى المنصة",
        description: "حوّل المبلغ إلى حساب المنصة البنكي",
      });
    }

    return methods;
  };

  const availableMethods = getAvailableMethods();
  const isBankTransfer = paymentMethod === "platform_transfer" || paymentMethod === "partner_transfer";
  const displayedAccounts = paymentMethod === "partner_transfer" ? partnerBankAccounts : platformAccounts;

  const handleSubmit = async () => {
    if (!user || !entityType || !entityId || !paymentMethod) return;

    if (isBankTransfer) {
      if (!payerName.trim()) {
        toast({ title: "خطأ", description: "يرجى إدخال اسمك", variant: "destructive" });
        return;
      }
      if (!payerPhone.trim()) {
        toast({ title: "خطأ", description: "يرجى إدخال رقم هاتفك", variant: "destructive" });
        return;
      }
      if (!receiptFile) {
        toast({ title: "خطأ", description: "يرجى رفع صورة إيصال الدفع", variant: "destructive" });
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

      // Upload receipt if bank transfer
      let receiptUrl: string | undefined;
      if (isBankTransfer && receiptFile) {
        receiptUrl = await uploadPaymentReceipt(user.id, receiptFile);
      }

      // Create payment transaction
      const paymentTx = await createPaymentTransaction({
        user_id: user.id,
        related_entity_id: entityId,
        entity_type: entityType,
        amount,
        payment_method: payMethodDb,
        transfer_receipt_url: receiptUrl,
        transfer_reference: isBankTransfer ? payerPhone.trim() : undefined,
        partner_id: paymentMethod === "partner_transfer" ? partnerId : undefined,
      });

      // Update booking with payment info
      if (entityType === "booking") {
        await supabase.from("bookings").update({
          payment_method: payMethodDb,
          payment_status: "pending",
          payer_name: payerName.trim() || null,
          payer_phone: payerPhone.trim() || null,
          payment_receipt_url: receiptUrl || null,
          customer_notes: customerNotes.trim() || null,
        } as any).eq("id", entityId);
      }

      // Create financial transaction
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
        });
      }

      // Notifications
      if (isBankTransfer) {
        try {
          await sendPushNotification({
            targetRole: "admin",
            title: "تحويل بنكي جديد 🏦",
            body: `عميل قام برفع إيصال دفع بمبلغ ${amount.toLocaleString()} ر.ي - ${entityLabels[entityType] || entityType}`,
            data: { type: "payment", entityType, entityId },
          });
          if (partnerId) {
            await sendPushNotification({
              userId: partnerId,
              title: "إيصال دفع جديد 🏦",
              body: `عميل حوّل مبلغ ${amount.toLocaleString()} ر.ي إلى حسابك`,
              data: { type: "payment_direct" },
            });
          }
        } catch {}
        toast({ title: "تم بنجاح", description: "تم إرسال إيصال الدفع وسيتم مراجعته قريباً" });
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
                      <span className="font-medium">{new Date(tripDetails.departure_time).toLocaleString("ar")}</span>
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

            {entityType === "shipment" && entity && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">نوع الشحنة</span>
                <span className="font-medium">{entity.shipment_type}</span>
              </div>
            )}

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
                {paymentMethod === "partner_transfer" ? "حساب صاحب المكتب" : "حسابات المنصة"}
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

        {/* Transfer Form (shown for bank transfer) */}
        {isBankTransfer && (
          <Card>
            <CardHeader><CardTitle className="text-lg">بيانات الدفع</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payerName">الاسم الكامل *</Label>
                <Input
                  id="payerName"
                  placeholder="أدخل اسمك الكامل"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payerPhone">رقم الهاتف *</Label>
                <Input
                  id="payerPhone"
                  placeholder="أدخل رقم هاتفك"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>صورة إيصال الدفع *</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => document.getElementById("receipt-file")?.click()}
                >
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img src={previewUrl} alt="صورة الإيصال" className="max-h-48 mx-auto rounded-lg" />
                      <p className="text-sm text-muted-foreground">{receiptFile?.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">اضغط لرفع صورة إيصال الدفع</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, PDF - حد أقصى 5MB</p>
                    </div>
                  )}
                </div>
                <input id="receipt-file" type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Notes (always shown when payment method is selected) */}
        {paymentMethod && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <StickyNote className="w-5 h-5" />
                ملاحظات (اختياري)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={entityType === "booking" ? "مثال: أريد أن ينتظرني السائق أمام المنزل / مكان الانتظار..." : "أضف أي ملاحظة تريد إبلاغها لمقدم الخدمة"}
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {paymentMethod && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || (isBankTransfer && (!payerName.trim() || !payerPhone.trim() || !receiptFile))}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <CheckCircle className="w-4 h-4 ml-2" />
            )}
            {submitting ? "جارٍ الإرسال..." : isBankTransfer ? "تأكيد الدفع وإرسال الإيصال" : "تأكيد الدفع نقداً"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
