import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package, ShoppingBag, UtensilsCrossed, ArrowRight, ArrowLeft,
  MapPin, CheckCircle, User, Phone, FileText, ImageIcon,
  Navigation, Truck, Search, Tag, Gift, Clock, BadgeCheck,
  Percent, Weight, Send, LocateFixed, Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { fetchSuppliers, createShipmentRequest } from "@/lib/customerApi";
import { calcDistanceDeliveryFee } from "@/lib/distanceUtils";
import { getDeliveryOffers } from "@/lib/deliveryOffersApi";
import type { DeliveryOffer } from "@/lib/deliveryOffersApi";
import MapPicker from "@/components/maps/MapPicker";
import ImageUpload from "@/components/common/ImageUpload";
import AddressSelector from "@/components/addresses/AddressSelector";
import type { SelectedAddress } from "@/components/addresses/AddressSelector";

// ─── Constants ─────────────────────────────────────────────────────────────
const SERVICE_TYPES = [
  { key: "parcel",   label: "نقل طرد",      icon: Package,        desc: "توصيل طرد أو شحنة" },
  { key: "shopping", label: "تسوق",          icon: ShoppingBag,    desc: "تسوق من أي متجر"  },
  { key: "meal",     label: "توصيل وجبة",   icon: UtensilsCrossed, desc: "وجبة من مطعم"     },
];

const SIZES = [
  { key: "small",  label: "صغير",  desc: "كيس / علبة",       emoji: "📦" },
  { key: "medium", label: "متوسط", desc: "حقيبة / كرتون",    emoji: "🗃️" },
  { key: "large",  label: "كبير",  desc: "أثاث / صناديق",    emoji: "🚛" },
];

const STEPS = ["الخدمة والشركة", "نقطة الاستلام", "نقطة التسليم", "التفاصيل والتأكيد"];

type Step = 1 | 2 | 3 | 4;
type UserRole = "sender" | "receiver" | "third";

// ─── Notify supplier ────────────────────────────────────────────────────────
const notifySupplier = async (supplierId: string, shipmentId: string, customerName: string) => {
  try {
    await (supabase.from as any)("notifications").insert({
      user_id: supplierId,
      title: "📦 طلب شحن جديد!",
      body: `${customerName} — يحتاج تأكيداً وتسعيراً`,
      data: { type: "new_shipment", url: "/supplier/shipments", shipment_id: shipmentId },
      is_read: false,
    });
  } catch (_) {}
};

// ─── Step progress bar ──────────────────────────────────────────────────────
const StepBar = ({ step }: { step: Step }) => (
  <div className="mb-6" dir="rtl">
    <div className="flex items-center">
      {([1, 2, 3, 4] as Step[]).map((n) => (
        <div key={n} className="flex items-center flex-1 last:flex-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
            n < step  ? "bg-primary text-white shadow-sm" :
            n === step ? "bg-primary text-white ring-4 ring-primary/20 shadow-md" :
            "bg-muted text-muted-foreground"
          }`}>
            {n < step ? <CheckCircle className="w-4 h-4" /> : n}
          </div>
          {n < 4 && <div className={`h-0.5 flex-1 mx-1 transition-all duration-500 ${n < step ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
    <div className="flex justify-between mt-2 px-1">
      {STEPS.map((lbl, i) => (
        <span key={i} className={`text-[9px] text-center leading-tight ${
          i + 1 === step ? "text-primary font-bold" : "text-muted-foreground"
        }`} style={{ width: i < 3 ? "calc(25%)" : "auto" }}>
          {lbl}
        </span>
      ))}
    </div>
  </div>
);

// ─── Location card with map ─────────────────────────────────────────────────
interface LocationCardProps {
  title: string;
  color: "green" | "red";
  lat: number;
  lng: number;
  address: string;
  landmark: string;
  onLatLng: (lat: number, lng: number) => void;
  onAddress: (v: string) => void;
  onLandmark: (v: string) => void;
  showAddressSelector?: boolean;
  onAddressSelect?: (addr: SelectedAddress | null) => void;
}

const LocationCard = ({
  title, color, lat, lng, address, landmark,
  onLatLng, onAddress, onLandmark, showAddressSelector, onAddressSelect,
}: LocationCardProps) => {
  const dot = color === "green" ? "bg-green-500" : "bg-red-500";
  const ring = color === "green" ? "ring-green-200 dark:ring-green-900" : "ring-red-200 dark:ring-red-900";
  const border = color === "green" ? "border-green-200 dark:border-green-900/50" : "border-red-200 dark:border-red-900/50";

  const shareLocation = () => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    if (navigator.share) {
      navigator.share({ title, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <Card className={`border ${border}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${dot} ring-2 ${ring}`} />
            {title}
          </p>
          {lat !== 0 && (
            <button onClick={shareLocation}
              className="text-xs text-primary flex items-center gap-1 hover:underline"
              title="مشاركة رابط الموقع">
              <LinkIcon className="w-3 h-3" /> مشاركة
            </button>
          )}
        </div>

        {showAddressSelector && onAddressSelect && (
          <AddressSelector
            label="اختر من عناوينك المحفوظة"
            onSelect={onAddressSelect}
            showUseMyLocation
            onUseMyLocation={(lt, ln) => onLatLng(lt, ln)}
          />
        )}

        <div className="space-y-2">
          <Input
            value={address}
            onChange={e => onAddress(e.target.value)}
            placeholder="اكتب العنوان أو اختره من الخريطة"
            className="h-10"
            dir="rtl"
          />
          <Input
            value={landmark}
            onChange={e => onLandmark(e.target.value)}
            placeholder="أقرب معلم أو وصف إضافي (اختياري)"
            className="h-9 text-sm"
            dir="rtl"
          />
        </div>

        <div>
          <MapPicker
            lat={lat || undefined}
            lng={lng || undefined}
            onLocationSelect={(lt, ln) => onLatLng(lt, ln)}
            height="200px"
          />
        </div>

        {lat !== 0 ? (
          <p className="text-xs text-green-600 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" /> تم تحديد الموقع بنجاح
          </p>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 opacity-50" /> انقر على الخريطة لتحديد الموقع بدقة
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────
const DeliveryRequestPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [serviceType, setServiceType] = useState("parcel");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyOffers, setCompanyOffers] = useState<DeliveryOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<DeliveryOffer | null>(null);
  const [pricePerKm, setPricePerKm] = useState(0);
  const [minFee, setMinFee] = useState(0);
  const [companyOfferMap, setCompanyOfferMap] = useState<Record<string, DeliveryOffer[]>>({});

  // Step 2: Pickup
  const [pickup, setPickup] = useState({ address: "", lat: 0, lng: 0, landmark: "" });

  // Step 3: Dropoff
  const [dropoff, setDropoff] = useState({ address: "", lat: 0, lng: 0, landmark: "" });

  // Step 4: Details + parties
  const [userRole, setUserRole] = useState<UserRole>("sender");
  const [sender, setSender] = useState({ name: "", phone: "" });
  const [receiver, setReceiver] = useState({ name: "", phone: "" });
  const [item, setItem] = useState({
    description: "", size: "medium", weight: "",
    dimensions: "", image_url: "", notes: "", payment_method: "cash",
  });

  // Auto-fill from profile
  useEffect(() => {
    if (!profile) return;
    if (userRole === "sender") setSender({ name: profile.full_name || "", phone: profile.phone || "" });
    else if (userRole === "receiver") setReceiver({ name: profile.full_name || "", phone: profile.phone || "" });
  }, [userRole, profile]);

  // Load company pricing
  useEffect(() => {
    if (!selectedSupplier?.user_id) return;
    supabase.from("partner_settings" as any)
      .select("price_per_km, min_delivery_fee")
      .eq("partner_id", selectedSupplier.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPricePerKm(Number((data as any).price_per_km ?? 0));
          setMinFee(Number((data as any).min_delivery_fee ?? 0));
        } else {
          setPricePerKm(0);
          setMinFee(0);
        }
      });
    getDeliveryOffers(selectedSupplier.user_id)
      .then(offers => { setCompanyOffers(offers.filter(o => o.is_active)); setSelectedOffer(null); })
      .catch(() => setCompanyOffers([]));
  }, [selectedSupplier]);

  const { data: suppliers, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });

  // Load offers for all companies
  useEffect(() => {
    if (!suppliers?.length) return;
    Promise.all(suppliers.map(async (s: any) => {
      try {
        const offers = await getDeliveryOffers(s.user_id);
        return [s.user_id, offers.filter((o: DeliveryOffer) => o.is_active)] as [string, DeliveryOffer[]];
      } catch { return [s.user_id, []] as [string, DeliveryOffer[]]; }
    })).then(entries => {
      const map: Record<string, DeliveryOffer[]> = {};
      for (const [id, offers] of entries) if (offers.length) map[id] = offers;
      setCompanyOfferMap(map);
    });
  }, [suppliers]);

  const filtered = (suppliers || []).filter((s: any) =>
    !searchTerm ||
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Price calculation
  const { estimatedFee, distanceKm } = useMemo(() => {
    if (pricePerKm > 0 && pickup.lat && pickup.lng && dropoff.lat && dropoff.lng) {
      const r = calcDistanceDeliveryFee(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, pricePerKm, minFee);
      return { estimatedFee: r.fee, distanceKm: r.distanceKm };
    }
    return { estimatedFee: null, distanceKm: null };
  }, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng, pricePerKm, minFee]);

  const finalFee = useMemo(() => {
    if (estimatedFee === null || !selectedOffer) return estimatedFee;
    if (selectedOffer.offer_type === "free_delivery") return 0;
    if (selectedOffer.offer_type === "percent_off_delivery")
      return Math.max(0, Math.round(estimatedFee * (1 - (selectedOffer.discount_percent || 0) / 100)));
    if (selectedOffer.offer_type === "fixed_off_delivery")
      return Math.max(0, estimatedFee - (selectedOffer.discount_amount || 0));
    return estimatedFee;
  }, [estimatedFee, selectedOffer]);

  const bothLocationsSet = pickup.lat !== 0 && dropoff.lat !== 0;

  // Validation
  const validateStep = (): string | null => {
    if (step === 1 && !selectedSupplier) return "اختر شركة التوصيل أولاً";
    if (step === 2 && !pickup.address) return "أدخل عنوان الاستلام";
    if (step === 3 && !dropoff.address) return "أدخل عنوان التسليم";
    if (step === 4 && (!sender.name || !sender.phone)) return "أدخل اسم ورقم المرسِل";
    if (step === 4 && (!receiver.name || !receiver.phone)) return "أدخل اسم ورقم المستلِم";
    return null;
  };

  const goNext = () => {
    const err = validateStep();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    setStep(s => Math.min(4, s + 1) as Step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (step > 1) { setStep(s => (s - 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else navigate(-1);
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" }); navigate("/login"); return; }
    const err = validateStep();
    if (err) { toast({ title: err, variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const svcLabel = SERVICE_TYPES.find(s => s.key === serviceType)?.label || serviceType;
      const sizeLabel = SIZES.find(s => s.key === item.size)?.label || item.size;
      const desc = [
        `[نوع الخدمة: ${svcLabel}]`,
        `[الحجم: ${sizeLabel}]`,
        item.description && `[الوصف: ${item.description}]`,
        `[المرسِل: ${sender.name} - ${sender.phone}]`,
        !bothLocationsSet && "[التسعير: يرجى التواصل لتحديد السعر]",
        selectedOffer && `[عرض مطبّق: ${selectedOffer.title}]`,
      ].filter(Boolean).join(" ");

      const result = await createShipmentRequest({
        customer_id: user.id,
        supplier_id: selectedSupplier.user_id,
        shipment_type: "door_to_door",
        pickup_address: pickup.address,
        pickup_lat: pickup.lat || undefined,
        pickup_lng: pickup.lng || undefined,
        pickup_landmark: pickup.landmark || undefined,
        delivery_address: dropoff.address,
        delivery_lat: dropoff.lat || undefined,
        delivery_lng: dropoff.lng || undefined,
        delivery_landmark: dropoff.landmark || undefined,
        recipient_name: receiver.name,
        recipient_phone: receiver.phone,
        item_description: desc,
        item_weight: item.weight ? Number(item.weight) : undefined,
        item_dimensions: item.dimensions || undefined,
        payment_method: item.payment_method,
      } as any);

      if (result?.id) {
        await notifySupplier(
          selectedSupplier.user_id,
          result.id,
          sender.name || profile?.full_name || "عميل"
        );
      }

      toast({ title: "✅ تم إرسال الطلب بنجاح!", description: "سيتم التواصل معك لتأكيد السعر والتفاصيل." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ في الإرسال", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // ─── Price Bar (shown on steps 2-4) ───────────────────────────────────────
  const PriceBar = () => {
    if (step === 1) return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border shadow-lg px-4 py-3" dir="rtl">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="w-4 h-4 text-primary shrink-0" />
            {distanceKm !== null ? (
              <span className="text-muted-foreground">
                المسافة: <strong className="text-foreground">{distanceKm.toFixed(1)} كم</strong>
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">
                {bothLocationsSet ? "جارٍ احتساب السعر..." : "حدد المواقع لرؤية التقدير"}
              </span>
            )}
          </div>
          <div className="text-right">
            {finalFee !== null ? (
              <div>
                <span className="font-black text-lg text-primary">~{finalFee.toLocaleString()} ر.ي</span>
                {selectedOffer && <span className="text-[10px] text-green-600 block">بعد الخصم</span>}
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                {selectedSupplier ? "سعر عند الطلب" : "اختر الشركة"}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <div className="container mx-auto px-4 pt-4 pb-32 max-w-2xl">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" onClick={goPrev} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-black text-xl leading-tight">طلب توصيل</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{STEPS[step - 1]}</p>
          </div>
          {selectedSupplier && step > 1 && (
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold shrink-0">
              <Truck className="w-3.5 h-3.5" />
              {selectedSupplier.full_name}
            </div>
          )}
        </div>

        {/* ── Step bar ── */}
        <StepBar step={step} />

        {/* ══════════════════════════════════
            STEP 1 — الخدمة والشركة
        ══════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">

            {/* Service type */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> نوع الخدمة
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_TYPES.map(s => {
                    const Icon = s.icon;
                    const isActive = serviceType === s.key;
                    return (
                      <button key={s.key} onClick={() => setServiceType(s.key)}
                        className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 text-xs font-medium transition-all ${
                          isActive ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="font-bold">{s.label}</span>
                        <span className={`text-[9px] ${isActive ? "text-primary/80" : "text-muted-foreground/70"}`}>{s.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Company list */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> اختر شركة التوصيل *
                </p>
                <div className="relative mb-3">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن شركة..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pr-9 h-10"
                  />
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
                  </div>
                ) : filtered.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filtered.map((s: any) => {
                      const offers = companyOfferMap[s.user_id] || [];
                      const isSelected = selectedSupplier?.user_id === s.user_id;
                      return (
                        <button key={s.user_id} onClick={() => setSelectedSupplier(s)}
                          className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Truck className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{s.full_name}</span>
                                {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                              </div>
                              {s.city && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />{s.city}
                                </p>
                              )}
                              {offers.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full mt-1">
                                  <Tag className="w-2.5 h-2.5" /> {offers.length} عرض
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد شركات توصيل متاحة حالياً</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Offers */}
            {selectedSupplier && companyOffers.length > 0 && (
              <Card className="border-red-200 dark:border-red-900/50">
                <CardContent className="p-4">
                  <p className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-red-500" />
                    عروض {selectedSupplier.full_name}
                  </p>
                  <div className="space-y-2">
                    {companyOffers.map(offer => {
                      const isSel = selectedOffer?.id === offer.id;
                      const label =
                        offer.offer_type === "free_delivery" ? "توصيل مجاني" :
                        offer.offer_type === "percent_off_delivery" ? `خصم ${offer.discount_percent}%` :
                        `خصم ${offer.discount_amount?.toLocaleString()} ر.ي`;
                      return (
                        <button key={offer.id} onClick={() => setSelectedOffer(isSel ? null : offer)}
                          className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                            isSel ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-border hover:border-red-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-sm">{offer.title}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  offer.offer_type === "free_delivery" ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                }`}>{label}</span>
                              </div>
                              {offer.description && <p className="text-xs text-muted-foreground mt-0.5">{offer.description}</p>}
                              <div className="flex flex-wrap gap-2 mt-1">
                                {offer.min_order_amount && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <BadgeCheck className="w-3 h-3" /> حد أدنى {offer.min_order_amount.toLocaleString()} ر.ي
                                  </span>
                                )}
                                {offer.active_days?.length && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="w-3 h-3" /> {offer.active_days.join("، ")}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSel
                              ? <CheckCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              : <div className="w-5 h-5 rounded-full border-2 border-muted shrink-0 mt-0.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedOffer && (
                    <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs">
                      <Gift className="w-4 h-4 shrink-0" /> تم تفعيل العرض — سيُطبَّق على السعر النهائي
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Button className="w-full h-12 text-base gap-2" onClick={goNext} disabled={!selectedSupplier}>
              التالي — تحديد نقطة الاستلام
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ══════════════════════════════════
            STEP 2 — نقطة الاستلام (Pickup)
        ══════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
              <MapPin className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">من أين سيتم الاستلام؟</p>
                <p className="text-xs opacity-80">انقر على الخريطة أو ابحث عن عنوانك</p>
              </div>
            </div>

            <LocationCard
              title="نقطة الاستلام"
              color="green"
              lat={pickup.lat}
              lng={pickup.lng}
              address={pickup.address}
              landmark={pickup.landmark}
              onLatLng={(lt, ln) => setPickup(p => ({ ...p, lat: lt, lng: ln }))}
              onAddress={v => setPickup(p => ({ ...p, address: v }))}
              onLandmark={v => setPickup(p => ({ ...p, landmark: v }))}
              showAddressSelector={true}
              onAddressSelect={(addr) => {
                if (!addr) return;
                setPickup({
                  address: addr.full_address,
                  lat: addr.latitude || 0,
                  lng: addr.longitude || 0,
                  landmark: addr.landmark || "",
                });
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11" onClick={goPrev}>
                <ArrowRight className="w-4 h-4 ml-1" /> السابق
              </Button>
              <Button className="h-11 gap-2" onClick={goNext}>
                التالي <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            STEP 3 — نقطة التسليم (Dropoff)
        ══════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Pickup summary */}
            {pickup.address && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-xs">من:</p>
                  <p className="text-xs truncate">{pickup.address}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm">
              <MapPin className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">إلى أين سيتم التوصيل؟</p>
                <p className="text-xs opacity-80">انقر على الخريطة أو أدخل عنوان التسليم</p>
              </div>
            </div>

            <LocationCard
              title="نقطة التسليم"
              color="red"
              lat={dropoff.lat}
              lng={dropoff.lng}
              address={dropoff.address}
              landmark={dropoff.landmark}
              onLatLng={(lt, ln) => setDropoff(d => ({ ...d, lat: lt, lng: ln }))}
              onAddress={v => setDropoff(d => ({ ...d, address: v }))}
              onLandmark={v => setDropoff(d => ({ ...d, landmark: v }))}
              showAddressSelector={true}
              onAddressSelect={(addr) => {
                if (!addr) return;
                setDropoff({
                  address: addr.full_address,
                  lat: addr.latitude || 0,
                  lng: addr.longitude || 0,
                  landmark: addr.landmark || "",
                });
              }}
            />

            {/* No-coordinates notice */}
            {!bothLocationsSet && (
              <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <span className="text-base shrink-0">💡</span>
                    <span>
                      لم تحدد الموقع على الخريطة بعد — يمكنك المتابعة وسيتواصل معك المندوب لتحديد السعر،
                      أو انقر على الخريطة لحساب التقدير فوراً.
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11" onClick={goPrev}>
                <ArrowRight className="w-4 h-4 ml-1" /> السابق
              </Button>
              <Button className="h-11 gap-2" onClick={goNext}>
                التالي <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            STEP 4 — التفاصيل والتأكيد
        ══════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">

            {/* Who are you */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-bold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> أنت في هذا الطلب؟
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "sender",   label: "أنا المرسِل",  emoji: "📤" },
                    { key: "receiver", label: "أنا المستلِم", emoji: "📥" },
                    { key: "third",    label: "طرف آخر",      emoji: "🔄" },
                  ] as const).map(r => (
                    <button key={r.key} onClick={() => setUserRole(r.key)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        userRole === r.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <span className="text-2xl">{r.emoji}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sender */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    المرسِل — جهة الإرسال
                  </p>
                  {userRole === "sender" && (
                    <Badge variant="secondary" className="text-[10px] py-0.5 gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> أنت
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">الاسم *</Label>
                    <Input value={sender.name} onChange={e => setSender(s => ({ ...s, name: e.target.value }))}
                      placeholder="اسم المرسِل" className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">الهاتف *</Label>
                    <Input value={sender.phone} onChange={e => setSender(s => ({ ...s, phone: e.target.value }))}
                      placeholder="7XX XXX XXX" className="h-10" dir="ltr" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receiver */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    المستلِم — جهة التسليم
                  </p>
                  {userRole === "receiver" && (
                    <Badge variant="secondary" className="text-[10px] py-0.5 gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> أنت
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">الاسم *</Label>
                    <Input value={receiver.name} onChange={e => setReceiver(r => ({ ...r, name: e.target.value }))}
                      placeholder="اسم المستلِم" className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">الهاتف *</Label>
                    <Input value={receiver.phone} onChange={e => setReceiver(r => ({ ...r, phone: e.target.value }))}
                      placeholder="7XX XXX XXX" className="h-10" dir="ltr" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Item details */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> تفاصيل الطرد
                </p>

                <div>
                  <Label className="text-xs mb-1.5 block">ما الذي تريد توصيله / شراءه؟</Label>
                  <Textarea
                    value={item.description}
                    onChange={e => setItem(i => ({ ...i, description: e.target.value }))}
                    placeholder={
                      serviceType === "shopping" ? "مثال: اشترِ من الصيدلية — باراسيتامول 500مج × 2..." :
                      serviceType === "meal"     ? "مثال: وجبة برغر مع بطاطس من مطعم..." :
                                                   "مثال: علبة ملابس، جهاز إلكتروني..."
                    }
                    rows={3}
                    className="resize-none"
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-2 block">حجم الطرد</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map(sz => (
                      <button key={sz.key} onClick={() => setItem(i => ({ ...i, size: sz.key }))}
                        className={`flex flex-col items-center py-3 rounded-xl border-2 text-xs transition-all ${
                          item.size === sz.key ? "border-primary bg-primary/10 text-primary" : "border-border"
                        }`}
                      >
                        <span className="text-xl mb-0.5">{sz.emoji}</span>
                        <span className="font-bold">{sz.label}</span>
                        <span className="text-[10px] opacity-60">{sz.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block flex items-center gap-1">
                      <Weight className="w-3 h-3" /> الوزن (كجم)
                    </Label>
                    <Input type="number" value={item.weight} onChange={e => setItem(i => ({ ...i, weight: e.target.value }))}
                      placeholder="مثال: 2" className="h-10" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">الأبعاد</Label>
                    <Input value={item.dimensions} onChange={e => setItem(i => ({ ...i, dimensions: e.target.value }))}
                      placeholder="30×20×10 سم" className="h-10" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs mb-1.5 flex items-center gap-1 block">
                    <ImageIcon className="w-3 h-3" /> صورة الطرد (اختياري)
                  </Label>
                  <ImageUpload
                    value={item.image_url}
                    onChange={url => setItem(i => ({ ...i, image_url: url }))}
                    bucket="restaurant-images"
                    folder="shipments"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">ملاحظات إضافية</Label>
                  <Input value={item.notes} onChange={e => setItem(i => ({ ...i, notes: e.target.value }))}
                    placeholder="أي تعليمات للمندوب..." className="h-10" />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">طريقة الدفع</Label>
                  <Select value={item.payment_method} onValueChange={v => setItem(i => ({ ...i, payment_method: v }))}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً عند الاستلام</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="card">بطاقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Price summary */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm font-bold flex items-center gap-2 mb-3">
                  <Navigation className="w-4 h-4 text-primary" /> ملخص التسعير
                </p>
                {distanceKm !== null && estimatedFee !== null ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">المسافة</span>
                      <span className="font-medium">{distanceKm.toFixed(1)} كم</span>
                    </div>
                    {pricePerKm > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">سعر الكيلومتر</span>
                        <span>{pricePerKm.toLocaleString()} ر.ي/كم</span>
                      </div>
                    )}
                    {selectedOffer && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> {selectedOffer.title}</span>
                        <span>
                          {selectedOffer.offer_type === "free_delivery" ? "مجاني" :
                           selectedOffer.offer_type === "percent_off_delivery" ? `-${selectedOffer.discount_percent}%` :
                           `-${selectedOffer.discount_amount?.toLocaleString()} ر.ي`}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-black text-xl">
                      <span>التقدير المبدئي</span>
                      <span className="text-primary">{(finalFee ?? estimatedFee).toLocaleString()} ر.ي</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">* السعر النهائي يُؤكَّد من شركة التوصيل</p>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-muted-foreground">
                      {!bothLocationsSet
                        ? "لم تحدد الموقعين على الخريطة — سيرسل لك المندوب سعراً مخصصاً"
                        : pricePerKm > 0
                        ? "جارٍ احتساب السعر..."
                        : "سيصلك سعر من شركة التوصيل بعد الإرسال"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order summary */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <p className="font-bold mb-2">📋 ملخص الطلب</p>
                <div className="flex justify-between"><span className="text-muted-foreground">الشركة</span><span className="font-medium">{selectedSupplier?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">نوع الخدمة</span><span>{SERVICE_TYPES.find(s => s.key === serviceType)?.label}</span></div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">من</span>
                  <span className="text-xs text-left truncate">{pickup.address || "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">إلى</span>
                  <span className="text-xs text-left truncate">{dropoff.address || "—"}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">المرسِل</span><span>{sender.name} {sender.phone && `· ${sender.phone}`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المستلِم</span><span>{receiver.name} {receiver.phone && `· ${receiver.phone}`}</span></div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-12" onClick={goPrev}>
                <ArrowRight className="w-4 h-4 ml-1" /> السابق
              </Button>
              <Button className="h-12 text-base gap-2" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  : <>
                      <Send className="w-4 h-4" />
                      {finalFee !== null ? `اطلب الآن · ~${finalFee.toLocaleString()} ر.ي` : "إرسال الطلب"}
                    </>}
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Sticky price bar */}
      <PriceBar />
    </div>
  );
};

export default DeliveryRequestPage;
