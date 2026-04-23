import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Package, Truck, User, Phone, MapPin, FileText, Weight,
  Search, Globe, ShoppingBag, UtensilsCrossed, ArrowRight,
  Navigation, CheckCircle, ImageIcon, ChevronLeft, Tag,
  Percent, Gift, Clock, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSuppliers, createShipmentRequest } from "@/lib/customerApi";
import { supabase } from "@/integrations/supabase/client";
import BackButton from "@/components/common/BackButton";
import AddressSelector from "@/components/addresses/AddressSelector";
import type { SelectedAddress } from "@/components/addresses/AddressSelector";
import MapPicker from "@/components/maps/MapPicker";
import { AverageRating } from "@/components/reviews/ReviewsList";
import ImageUpload from "@/components/common/ImageUpload";
import { calcDistanceDeliveryFee } from "@/lib/distanceUtils";
import { getActiveOffersForCompany, getDeliveryOffers } from "@/lib/deliveryOffersApi";
import type { DeliveryOffer } from "@/lib/deliveryOffersApi";

// ─── Service types ────────────────────────────────────────────
const SERVICE_TYPES = [
  { key: "parcel",   label: "نقل طرد",      icon: Package,         color: "bg-blue-500"   },
  { key: "shopping", label: "تسوق من متجر", icon: ShoppingBag,     color: "bg-purple-500" },
  { key: "meal",     label: "توصيل وجبة",   icon: UtensilsCrossed, color: "bg-orange-500" },
];

const SIZES = [
  { key: "small",  label: "صغير",  desc: "كيس / علبة صغيرة" },
  { key: "medium", label: "متوسط", desc: "حقيبة / صندوق متوسط" },
  { key: "large",  label: "كبير",  desc: "صندوق كبير / أثاث" },
];

type UserRole = "sender" | "receiver" | "third";
type FormStep = 1 | 2 | 3 | 4;

// ─── Offer badge helper ───────────────────────────────────────
const OfferBadge = ({ offer }: { offer: DeliveryOffer }) => {
  const label =
    offer.offer_type === "free_delivery" ? "توصيل مجاني" :
    offer.offer_type === "percent_off_delivery" ? `خصم ${offer.discount_percent}%` :
    offer.offer_type === "fixed_off_delivery" ? `خصم ${offer.discount_amount?.toLocaleString()} ر.ي` :
    "عرض";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
      <Tag className="w-2.5 h-2.5" />{label}
    </span>
  );
};

// ─── Step indicator ───────────────────────────────────────────
const StepBar = ({ step, total = 4 }: { step: FormStep; total?: number }) => (
  <div className="flex items-center gap-1 mb-4">
    {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
      <div key={n} className="flex items-center gap-1 flex-1">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
          n < step ? "bg-primary text-white" :
          n === step ? "bg-primary text-white ring-2 ring-primary/30" :
          "bg-muted text-muted-foreground"
        }`}>
          {n < step ? <CheckCircle className="w-3.5 h-3.5" /> : n}
        </div>
        {n < total && <div className={`h-0.5 flex-1 transition-all ${n < step ? "bg-primary" : "bg-muted"}`} />}
      </div>
    ))}
  </div>
);

// ─── Send notification to supplier ───────────────────────────
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

// ─── Main component ───────────────────────────────────────────
const ShipmentsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Screens
  const [screen, setScreen] = useState<"select" | "form">("select");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workingAreas, setWorkingAreas] = useState<Record<string, string[]>>({});
  const [companyOfferMap, setCompanyOfferMap] = useState<Record<string, DeliveryOffer[]>>({});

  // ── Step 1: Service + Offers ──
  const [serviceType, setServiceType] = useState("parcel");
  const [companyOffers, setCompanyOffers] = useState<DeliveryOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<DeliveryOffer | null>(null);

  // ── Step 2: Sender/receiver ──
  const [userRole, setUserRole] = useState<UserRole>("sender");
  const [sender, setSender] = useState({ name: "", phone: "" });
  const [receiver, setReceiver] = useState({ name: "", phone: "" });

  // ── Step 3: Addresses ──
  const [pickup, setPickup] = useState({ address: "", lat: 0, lng: 0, landmark: "" });
  const [delivery, setDelivery] = useState({ address: "", lat: 0, lng: 0, landmark: "" });

  // ── Step 4: Item details ──
  const [item, setItem] = useState({
    description: "", size: "medium", weight: "", dimensions: "",
    image_url: "", notes: "", payment_method: "cash",
  });

  // ── Pricing ──
  const [pricePerKm, setPricePerKm] = useState(0);
  const [minFee, setMinFee] = useState(0);

  // Auto-fill sender/receiver from profile
  useEffect(() => {
    if (!profile) return;
    if (userRole === "sender") setSender({ name: profile.full_name || "", phone: profile.phone || "" });
    else if (userRole === "receiver") setReceiver({ name: profile.full_name || "", phone: profile.phone || "" });
  }, [userRole, profile]);

  // Fetch company pricing + offers when selected
  useEffect(() => {
    if (!selectedSupplier?.user_id) return;
    // Pricing
    supabase
      .from("partner_settings" as any)
      .select("price_per_km, min_delivery_fee")
      .eq("partner_id", selectedSupplier.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPricePerKm(Number((data as any).price_per_km ?? 0));
          setMinFee(Number((data as any).min_delivery_fee ?? 0));
        }
      });
    // Offers
    getDeliveryOffers(selectedSupplier.user_id).then((offers) => {
      const active = offers.filter(o => o.is_active);
      setCompanyOffers(active);
      setSelectedOffer(null);
    }).catch(() => setCompanyOffers([]));
  }, [selectedSupplier]);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

  // Fetch offers for all companies for badge display
  useEffect(() => {
    if (!suppliers?.length) return;
    const fetchAll = async () => {
      const map: Record<string, DeliveryOffer[]> = {};
      await Promise.all(
        suppliers.map(async (s: any) => {
          try {
            const offers = await getDeliveryOffers(s.user_id);
            const active = offers.filter((o: DeliveryOffer) => o.is_active);
            if (active.length) map[s.user_id] = active;
          } catch {}
        })
      );
      setCompanyOfferMap(map);
    };
    fetchAll();
  }, [suppliers]);

  // Working areas
  useEffect(() => {
    if (!suppliers || suppliers.length === 0) return;
    const fetchAreas = async () => {
      const ids = suppliers.map((s: any) => s.user_id);
      const { data: areas } = await supabase.from("supplier_working_areas").select("supplier_id, region_id").in("supplier_id", ids);
      if (!areas || areas.length === 0) return;
      const regionIds = [...new Set(areas.map((a: any) => a.region_id))];
      const { data: regions } = await supabase.from("regions").select("id, name_ar").in("id", regionIds);
      const regionMap = new Map((regions || []).map((r: any) => [r.id, r.name_ar]));
      const map: Record<string, string[]> = {};
      for (const a of areas as any[]) {
        if (!map[a.supplier_id]) map[a.supplier_id] = [];
        const name = regionMap.get(a.region_id);
        if (name) map[a.supplier_id].push(name as string);
      }
      setWorkingAreas(map);
    };
    fetchAreas();
  }, [suppliers]);

  const filtered = (suppliers || []).filter((s: any) =>
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Distance-based price estimate ──
  const { estimatedFee, distanceKm } = useMemo(() => {
    if (pricePerKm > 0 && pickup.lat !== 0 && pickup.lng !== 0 && delivery.lat !== 0 && delivery.lng !== 0) {
      const result = calcDistanceDeliveryFee(pickup.lat, pickup.lng, delivery.lat, delivery.lng, pricePerKm, minFee);
      return { estimatedFee: result.fee, distanceKm: result.distanceKm };
    }
    return { estimatedFee: null, distanceKm: null };
  }, [pickup.lat, pickup.lng, delivery.lat, delivery.lng, pricePerKm, minFee]);

  // Final fee after offer
  const finalFee = useMemo(() => {
    if (estimatedFee === null) return null;
    if (!selectedOffer) return estimatedFee;
    if (selectedOffer.offer_type === "free_delivery") return 0;
    if (selectedOffer.offer_type === "percent_off_delivery") {
      return Math.max(0, Math.round(estimatedFee * (1 - (selectedOffer.discount_percent || 0) / 100)));
    }
    if (selectedOffer.offer_type === "fixed_off_delivery") {
      return Math.max(0, estimatedFee - (selectedOffer.discount_amount || 0));
    }
    return estimatedFee;
  }, [estimatedFee, selectedOffer]);

  const handlePickupSelect = (addr: SelectedAddress | null) => {
    if (!addr) return;
    setPickup({ address: addr.full_address, lat: addr.latitude || 0, lng: addr.longitude || 0, landmark: addr.landmark || "" });
    if (userRole === "sender" && addr.phone) setSender(s => ({ ...s, phone: addr.phone! }));
  };

  const handleDeliverySelect = (addr: SelectedAddress | null) => {
    if (!addr) return;
    setDelivery({ address: addr.full_address, lat: addr.latitude || 0, lng: addr.longitude || 0, landmark: addr.landmark || "" });
    if (userRole === "receiver" && addr.phone) setReceiver(r => ({ ...r, phone: addr.phone! }));
  };

  // ── Step validation ──
  const canProceedStep1 = true; // service type always selected
  const canProceedStep2 = sender.name && sender.phone && receiver.name && receiver.phone;
  const canProceedStep3 = pickup.address && delivery.address;

  const handleNextStep = () => {
    if (formStep === 2 && !canProceedStep2) {
      toast({ title: "أدخل معلومات المرسِل والمستلِم كاملةً", variant: "destructive" }); return;
    }
    if (formStep === 3 && !canProceedStep3) {
      toast({ title: "أدخل عنوان الاستلام والتسليم", variant: "destructive" }); return;
    }
    setFormStep(s => (s + 1) as FormStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" }); navigate("/login"); return; }
    if (!pickup.address || !delivery.address) { toast({ title: "أدخل العناوين", variant: "destructive" }); return; }
    if (!sender.name || !sender.phone || !receiver.name || !receiver.phone) {
      toast({ title: "أدخل معلومات الأطراف", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const svcLabel = SERVICE_TYPES.find(s => s.key === serviceType)?.label || serviceType;
      const sizeLabel = SIZES.find(s => s.key === item.size)?.label || item.size;
      const offerNote = selectedOffer ? `[عرض مطبّق: ${selectedOffer.title}]` : "";
      const enrichedDescription = [
        `[نوع الخدمة: ${svcLabel}]`,
        `[الحجم: ${sizeLabel}]`,
        item.description ? `[الوصف: ${item.description}]` : "",
        `[المرسِل: ${sender.name} - ${sender.phone}]`,
        offerNote,
      ].filter(Boolean).join(" ");

      const enrichedNotes = [
        item.notes,
        item.image_url ? `[صورة الطرد: ${item.image_url}]` : "",
      ].filter(Boolean).join("\n");

      const result = await createShipmentRequest({
        customer_id: user.id,
        supplier_id: selectedSupplier.user_id,
        shipment_type: "door_to_door",
        pickup_address: pickup.address,
        pickup_lat: pickup.lat || undefined,
        pickup_lng: pickup.lng || undefined,
        pickup_landmark: pickup.landmark || undefined,
        delivery_address: delivery.address,
        delivery_lat: delivery.lat || undefined,
        delivery_lng: delivery.lng || undefined,
        delivery_landmark: delivery.landmark || undefined,
        recipient_name: receiver.name,
        recipient_phone: receiver.phone,
        item_description: enrichedDescription,
        item_weight: item.weight ? Number(item.weight) : undefined,
        item_dimensions: item.dimensions || undefined,
        payment_method: item.payment_method,
      } as any);

      // Notify supplier
      if (result?.id) {
        await notifySupplier(selectedSupplier.user_id, result.id, sender.name || profile?.full_name || "عميل");
      }

      toast({ title: "✅ تم إرسال الطلب بنجاح!", description: "سيتم التواصل معك لتأكيد السعر." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // ══════════════════════════════════════════════════════════
  // ── SCREEN 1: Company selection ──────────────────────────
  // ══════════════════════════════════════════════════════════
  if (screen === "select") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container mx-auto px-4 pt-6 pb-16 max-w-2xl">
          <BackButton />

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-black mb-1">خدمة التوصيل والشحن</h1>
            <p className="text-muted-foreground text-sm">اختر نوع الخدمة ثم شركة التوصيل</p>
          </div>

          {/* Service type tabs */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {SERVICE_TYPES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setServiceType(s.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    serviceType === s.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="ابحث عن شركة توصيل..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-10" />
          </div>

          {/* Company cards */}
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-20" /></Card>)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((s: any) => {
                const areas = workingAreas[s.user_id] || [];
                const offers = companyOfferMap[s.user_id] || [];
                return (
                  <Card
                    key={s.user_id}
                    className="hover:shadow-md transition-all cursor-pointer hover:border-primary"
                    onClick={() => { setSelectedSupplier(s); setFormStep(1); setScreen("form"); }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Truck className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-sm">{s.full_name}</h3>
                            <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                          {s.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city}</p>}
                          <AverageRating revieweeId={s.user_id} />
                          <div className="flex flex-wrap gap-1 mt-1">
                            {areas.slice(0, 3).map((a: string) => (
                              <span key={a} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{a}</span>
                            ))}
                            {areas.length > 3 && <span className="text-[10px] text-muted-foreground">+{areas.length - 3}</span>}
                          </div>
                          {/* Active offers badges */}
                          {offers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {offers.slice(0, 2).map(o => <OfferBadge key={o.id} offer={o} />)}
                              {offers.length > 2 && (
                                <span className="text-[10px] text-red-500 font-bold">+{offers.length - 2} عروض</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد شركات توصيل متاحة حالياً</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // ── SCREEN 2: Step-by-step form ──────────────────────────
  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <div className="container mx-auto px-4 pt-6 pb-16 max-w-2xl space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => formStep > 1 ? setFormStep(s => (s - 1) as FormStep) : setScreen("select")} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-base">طلب توصيل — {selectedSupplier?.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              {formStep === 1 ? "نوع الخدمة والعروض" :
               formStep === 2 ? "معلومات المرسِل والمستلِم" :
               formStep === 3 ? "عناوين الاستلام والتسليم" :
               "تفاصيل الطرد وتأكيد الطلب"}
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {formStep} / 4
          </Badge>
        </div>

        <StepBar step={formStep} />

        {/* ══ STEP 1: Service type + Company offers ══════════ */}
        {formStep === 1 && (
          <div className="space-y-4">
            {/* Service type */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> نوع الخدمة
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_TYPES.map(s => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setServiceType(s.key)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          serviceType === s.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <Icon className="w-5 h-5" />{s.label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Company offers */}
            {companyOffers.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-red-500" />
                    عروض {selectedSupplier?.full_name}
                  </h3>
                  <div className="space-y-2">
                    {companyOffers.map(offer => {
                      const isSelected = selectedOffer?.id === offer.id;
                      const discountLabel =
                        offer.offer_type === "free_delivery" ? "توصيل مجاني" :
                        offer.offer_type === "percent_off_delivery" ? `خصم ${offer.discount_percent}% على التوصيل` :
                        offer.offer_type === "fixed_off_delivery" ? `خصم ${offer.discount_amount?.toLocaleString()} ر.ي من التوصيل` :
                        "عرض خاص";

                      return (
                        <button
                          key={offer.id}
                          onClick={() => setSelectedOffer(isSelected ? null : offer)}
                          className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                              : "border-border bg-card hover:border-red-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">{offer.title}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  offer.offer_type === "free_delivery" ? "bg-green-500 text-white" :
                                  "bg-red-500 text-white"
                                }`}>{discountLabel}</span>
                              </div>
                              {offer.description && <p className="text-xs text-muted-foreground mt-0.5">{offer.description}</p>}
                              <div className="flex flex-wrap gap-2 mt-1">
                                {offer.min_order_amount && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <BadgeCheck className="w-3 h-3" /> حد أدنى {offer.min_order_amount.toLocaleString()} ر.ي
                                  </span>
                                )}
                                {offer.active_days && offer.active_days.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="w-3 h-3" /> {offer.active_days.join("، ")}
                                  </span>
                                )}
                                {offer.start_time && offer.end_time && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {offer.start_time} – {offer.end_time}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-red-500 shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedOffer && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs">
                      <Gift className="w-4 h-4" />
                      تم تطبيق العرض — سيُخصم من السعر النهائي
                    </div>
                  )}
                  {!selectedOffer && (
                    <p className="text-xs text-muted-foreground text-center">اضغط على أحد العروض لتفعيله (اختياري)</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Button className="w-full h-11" onClick={handleNextStep}>
              التالي — معلومات الأطراف
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            </Button>
          </div>
        )}

        {/* ══ STEP 2: Sender / Receiver ══════════════════════ */}
        {formStep === 2 && (
          <div className="space-y-4">
            {/* Who are you */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> أنت في هذا الطلب؟
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "sender",   label: "أنا المرسِل",  emoji: "📤" },
                    { key: "receiver", label: "أنا المستلِم", emoji: "📥" },
                    { key: "third",    label: "طرف آخر",      emoji: "🔄" },
                  ] as const).map(r => (
                    <button
                      key={r.key}
                      onClick={() => setUserRole(r.key)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        userRole === r.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className="text-xl">{r.emoji}</span>{r.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sender */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    المرسِل — جهة الإرسال
                  </h3>
                  {userRole === "sender" && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> أنت
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الاسم *</Label>
                    <Input value={sender.name} onChange={e => setSender(s => ({ ...s, name: e.target.value }))} placeholder="اسم المرسِل" className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">الهاتف *</Label>
                    <Input value={sender.phone} onChange={e => setSender(s => ({ ...s, phone: e.target.value }))} placeholder="7XX XXX XXX" className="h-9" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receiver */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    المستلِم — جهة التسليم
                  </h3>
                  {userRole === "receiver" && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> أنت
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الاسم *</Label>
                    <Input value={receiver.name} onChange={e => setReceiver(r => ({ ...r, name: e.target.value }))} placeholder="اسم المستلِم" className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">الهاتف *</Label>
                    <Input value={receiver.phone} onChange={e => setReceiver(r => ({ ...r, phone: e.target.value }))} placeholder="7XX XXX XXX" className="h-9" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full h-11" onClick={handleNextStep} disabled={!canProceedStep2}>
              التالي — العناوين
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            </Button>
          </div>
        )}

        {/* ══ STEP 3: Addresses + Maps ═══════════════════════ */}
        {formStep === 3 && (
          <div className="space-y-4">
            {/* Pickup */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  عنوان الاستلام (من أين؟) *
                </h3>
                {userRole === "sender" && (
                  <AddressSelector
                    label="اختر من عناوينك المحفوظة"
                    onSelect={handlePickupSelect}
                    showUseMyLocation
                    onUseMyLocation={(lat, lng) => setPickup(p => ({ ...p, lat, lng }))}
                  />
                )}
                <Input
                  value={pickup.address}
                  onChange={e => setPickup(p => ({ ...p, address: e.target.value }))}
                  placeholder="أدخل عنوان الاستلام..."
                  className="h-9"
                />
                <Input
                  value={pickup.landmark}
                  onChange={e => setPickup(p => ({ ...p, landmark: e.target.value }))}
                  placeholder="أقرب معلم (اختياري)"
                  className="h-9"
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">📍 تحديد الموقع على الخريطة</p>
                  <MapPicker
                    lat={pickup.lat || undefined}
                    lng={pickup.lng || undefined}
                    onLocationSelect={(lat, lng) => setPickup(p => ({ ...p, lat, lng }))}
                    height="180px"
                  />
                </div>
                {pickup.lat !== 0 && (
                  <p className="text-xs text-green-600">✅ تم تحديد الموقع</p>
                )}
              </CardContent>
            </Card>

            {/* Delivery */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  عنوان التسليم (إلى أين؟) *
                </h3>
                {userRole === "receiver" && (
                  <AddressSelector
                    label="اختر من عناوينك المحفوظة"
                    onSelect={handleDeliverySelect}
                    showUseMyLocation
                    onUseMyLocation={(lat, lng) => setDelivery(d => ({ ...d, lat, lng }))}
                  />
                )}
                <Input
                  value={delivery.address}
                  onChange={e => setDelivery(d => ({ ...d, address: e.target.value }))}
                  placeholder="أدخل عنوان التسليم..."
                  className="h-9"
                />
                <Input
                  value={delivery.landmark}
                  onChange={e => setDelivery(d => ({ ...d, landmark: e.target.value }))}
                  placeholder="أقرب معلم (اختياري)"
                  className="h-9"
                />
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">📍 تحديد الموقع على الخريطة</p>
                  <MapPicker
                    lat={delivery.lat || undefined}
                    lng={delivery.lng || undefined}
                    onLocationSelect={(lat, lng) => setDelivery(d => ({ ...d, lat, lng }))}
                    height="180px"
                  />
                </div>
                {delivery.lat !== 0 && (
                  <p className="text-xs text-green-600">✅ تم تحديد الموقع</p>
                )}
              </CardContent>
            </Card>

            {/* Live distance estimate */}
            {distanceKm !== null && estimatedFee !== null && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Navigation className="w-4 h-4 text-primary" />
                    المسافة التقريبية: <span className="font-bold text-foreground">{distanceKm.toFixed(1)} كم</span>
                  </div>
                  <div className="font-bold text-primary">
                    ~{(finalFee ?? estimatedFee).toLocaleString()} ر.ي
                    {selectedOffer && <span className="text-xs font-normal text-green-600 mr-1">(بعد الخصم)</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button className="w-full h-11" onClick={handleNextStep} disabled={!canProceedStep3}>
              التالي — تفاصيل الطرد
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            </Button>
          </div>
        )}

        {/* ══ STEP 4: Item details + Price + Submit ══════════ */}
        {formStep === 4 && (
          <div className="space-y-4">
            {/* Item details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> تفاصيل الطرد
                </h3>

                <div>
                  <Label className="text-xs">ما الذي تريد توصيله؟</Label>
                  <Textarea
                    value={item.description}
                    onChange={e => setItem(i => ({ ...i, description: e.target.value }))}
                    placeholder={
                      serviceType === "parcel" ? "مثال: ملابس، أجهزة إلكترونية..." :
                      serviceType === "shopping" ? "مثال: اشترِ لي من الصيدلية: باراسيتامول..." :
                      "مثال: وجبة عشاء من مطعم الشاطئ..."
                    }
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Size */}
                <div>
                  <Label className="text-xs mb-2 block">حجم الطرد</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map(sz => (
                      <button
                        key={sz.key}
                        onClick={() => setItem(i => ({ ...i, size: sz.key }))}
                        className={`flex flex-col items-center gap-0.5 py-2.5 rounded-lg border-2 text-xs transition-all ${
                          item.size === sz.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <span className="font-bold">{sz.label}</span>
                        <span className="text-[10px] opacity-70">{sz.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weight & dimensions */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Weight className="w-3 h-3" /> الوزن (كجم)</Label>
                    <Input type="number" value={item.weight} onChange={e => setItem(i => ({ ...i, weight: e.target.value }))} placeholder="مثال: 2" className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">الأبعاد (اختياري)</Label>
                    <Input value={item.dimensions} onChange={e => setItem(i => ({ ...i, dimensions: e.target.value }))} placeholder="30×20×10 سم" className="h-9" />
                  </div>
                </div>

                {/* Image */}
                <div>
                  <Label className="text-xs flex items-center gap-1 mb-1.5">
                    <ImageIcon className="w-3 h-3" /> صورة الطرد (اختياري)
                  </Label>
                  <ImageUpload
                    value={item.image_url}
                    onChange={url => setItem(i => ({ ...i, image_url: url }))}
                    bucket="restaurant-images"
                    folder="shipments"
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-xs">ملاحظات إضافية (اختياري)</Label>
                  <Input value={item.notes} onChange={e => setItem(i => ({ ...i, notes: e.target.value }))} placeholder="أي تعليمات إضافية..." className="h-9" />
                </div>

                {/* Payment */}
                <div>
                  <Label className="text-xs">طريقة الدفع</Label>
                  <Select value={item.payment_method} onValueChange={v => setItem(i => ({ ...i, payment_method: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" /> ملخص التسعير
                </h3>
                {distanceKm !== null && estimatedFee !== null ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">المسافة</span>
                      <span className="font-medium">{distanceKm.toFixed(1)} كم</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">سعر الكيلومتر</span>
                      <span>{pricePerKm.toLocaleString()} ر.ي/كم</span>
                    </div>
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
                    <div className="flex justify-between font-bold">
                      <span>التقدير المبدئي</span>
                      <span className="text-primary text-lg">{(finalFee ?? estimatedFee).toLocaleString()} ر.ي</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">* السعر النهائي يتم تأكيده من شركة التوصيل</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {pricePerKm > 0
                      ? "لم يتم تحديد الموقعين على الخريطة — سيصلك سعر من الشركة"
                      : "سيتم إرسال تسعيرة من شركة التوصيل بعد تقديم الطلب"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Order summary */}
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <h3 className="font-semibold text-sm mb-2">📋 ملخص الطلب</h3>
                <div className="flex justify-between"><span className="text-muted-foreground">نوع الخدمة</span><span>{SERVICE_TYPES.find(s => s.key === serviceType)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المرسِل</span><span>{sender.name} ({sender.phone})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المستلِم</span><span>{receiver.name} ({receiver.phone})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الاستلام من</span><span className="text-left max-w-[55%] truncate">{pickup.address}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">التسليم إلى</span><span className="text-left max-w-[55%] truncate">{delivery.address}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الحجم</span><span>{SIZES.find(s => s.key === item.size)?.label}</span></div>
                {selectedOffer && (
                  <div className="flex justify-between text-green-600">
                    <span>العرض المطبّق</span><span>{selectedOffer.title}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 text-base gap-2"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  {finalFee !== null
                    ? `اطلب الآن — ~${finalFee.toLocaleString()} ر.ي`
                    : "إرسال طلب التوصيل"}
                </>
              )}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ShipmentsPage;
