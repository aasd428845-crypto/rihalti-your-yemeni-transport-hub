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
import { getDeliveryOffers } from "@/lib/deliveryOffersApi";
import type { DeliveryOffer } from "@/lib/deliveryOffersApi";

// ─── Constants ────────────────────────────────────────────────
const SERVICE_TYPES = [
  { key: "parcel",   label: "نقل طرد",      icon: Package         },
  { key: "shopping", label: "تسوق من متجر", icon: ShoppingBag     },
  { key: "meal",     label: "توصيل وجبة",   icon: UtensilsCrossed },
];

const SIZES = [
  { key: "small",  label: "صغير",  desc: "كيس / علبة" },
  { key: "medium", label: "متوسط", desc: "حقيبة / كرتون" },
  { key: "large",  label: "كبير",  desc: "أثاث / صناديق" },
];

const STEP_LABELS = [
  "الخدمة والشركة",
  "معلومات الأطراف",
  "العناوين",
  "تفاصيل الطرد",
];

type UserRole = "sender" | "receiver" | "third";
type Step = 1 | 2 | 3 | 4;

// ─── Step progress bar ────────────────────────────────────────
const StepBar = ({ step }: { step: Step }) => (
  <div className="mb-5" dir="rtl">
    <div className="flex items-center gap-1">
      {([1, 2, 3, 4] as Step[]).map((n) => (
        <div key={n} className="flex items-center gap-1 flex-1 last:flex-none">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
            n < step  ? "bg-primary text-white" :
            n === step ? "bg-primary text-white ring-4 ring-primary/20" :
            "bg-muted text-muted-foreground"
          }`}>
            {n < step ? <CheckCircle className="w-4 h-4" /> : n}
          </div>
          {n < 4 && (
            <div className={`h-0.5 flex-1 transition-all duration-500 ${n < step ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
    <div className="flex justify-between mt-1.5 px-0.5">
      {STEP_LABELS.map((lbl, i) => (
        <span key={i} className={`text-[9px] text-center ${i + 1 === step ? "text-primary font-bold" : "text-muted-foreground"}`}
          style={{ width: i < 3 ? "calc(25% - 4px)" : "auto" }}
        >
          {lbl}
        </span>
      ))}
    </div>
  </div>
);

// ─── Notify supplier on new shipment ─────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────
const ShipmentsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Step 1: company + service + offers ──
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [workingAreas, setWorkingAreas] = useState<Record<string, string[]>>({});
  const [companyOfferMap, setCompanyOfferMap] = useState<Record<string, DeliveryOffer[]>>({});
  const [serviceType, setServiceType] = useState("parcel");
  const [companyOffers, setCompanyOffers] = useState<DeliveryOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<DeliveryOffer | null>(null);
  const [pricePerKm, setPricePerKm] = useState(0);
  const [minFee, setMinFee] = useState(0);

  // ── Step 2: sender/receiver ──
  const [userRole, setUserRole] = useState<UserRole>("sender");
  const [sender, setSender] = useState({ name: "", phone: "" });
  const [receiver, setReceiver] = useState({ name: "", phone: "" });

  // ── Step 3: addresses ──
  const [pickup, setPickup] = useState({ address: "", lat: 0, lng: 0, landmark: "" });
  const [delivery, setDelivery] = useState({ address: "", lat: 0, lng: 0, landmark: "" });

  // ── Step 4: item ──
  const [item, setItem] = useState({
    description: "", size: "medium", weight: "", dimensions: "",
    image_url: "", notes: "", payment_method: "cash",
  });

  // Auto-fill sender/receiver from profile
  useEffect(() => {
    if (!profile) return;
    if (userRole === "sender") setSender({ name: profile.full_name || "", phone: profile.phone || "" });
    else if (userRole === "receiver") setReceiver({ name: profile.full_name || "", phone: profile.phone || "" });
  }, [userRole, profile]);

  // Load company pricing & offers when company selected
  useEffect(() => {
    if (!selectedSupplier?.user_id) return;
    supabase.from("partner_settings" as any).select("price_per_km, min_delivery_fee")
      .eq("partner_id", selectedSupplier.user_id).maybeSingle()
      .then(({ data }) => {
        if (data) { setPricePerKm(Number((data as any).price_per_km ?? 0)); setMinFee(Number((data as any).min_delivery_fee ?? 0)); }
      });
    getDeliveryOffers(selectedSupplier.user_id)
      .then(offers => { setCompanyOffers(offers.filter(o => o.is_active)); setSelectedOffer(null); })
      .catch(() => setCompanyOffers([]));
  }, [selectedSupplier]);

  // Load all suppliers
  const { data: suppliers, isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });

  // Load working areas
  useEffect(() => {
    if (!suppliers?.length) return;
    const ids = suppliers.map((s: any) => s.user_id);
    supabase.from("supplier_working_areas").select("supplier_id, region_id").in("supplier_id", ids)
      .then(async ({ data: areas }) => {
        if (!areas?.length) return;
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
      });
  }, [suppliers]);

  // Load offer badges for all companies
  useEffect(() => {
    if (!suppliers?.length) return;
    Promise.all(suppliers.map(async (s: any) => {
      try {
        const offers = await getDeliveryOffers(s.user_id);
        const active = offers.filter((o: DeliveryOffer) => o.is_active);
        return [s.user_id, active] as [string, DeliveryOffer[]];
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

  // ── Price estimate ──
  const { estimatedFee, distanceKm } = useMemo(() => {
    if (pricePerKm > 0 && pickup.lat && pickup.lng && delivery.lat && delivery.lng) {
      const r = calcDistanceDeliveryFee(pickup.lat, pickup.lng, delivery.lat, delivery.lng, pricePerKm, minFee);
      return { estimatedFee: r.fee, distanceKm: r.distanceKm };
    }
    return { estimatedFee: null, distanceKm: null };
  }, [pickup.lat, pickup.lng, delivery.lat, delivery.lng, pricePerKm, minFee]);

  const finalFee = useMemo(() => {
    if (estimatedFee === null || !selectedOffer) return estimatedFee;
    if (selectedOffer.offer_type === "free_delivery") return 0;
    if (selectedOffer.offer_type === "percent_off_delivery")
      return Math.max(0, Math.round(estimatedFee * (1 - (selectedOffer.discount_percent || 0) / 100)));
    if (selectedOffer.offer_type === "fixed_off_delivery")
      return Math.max(0, estimatedFee - (selectedOffer.discount_amount || 0));
    return estimatedFee;
  }, [estimatedFee, selectedOffer]);

  // ── Navigation helpers ──
  const goNext = () => { setStep(s => Math.min(4, s + 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goPrev = () => { if (step > 1) { setStep(s => (s - 1) as Step); window.scrollTo({ top: 0, behavior: "smooth" }); } else navigate(-1); };

  const validateStep = (): string | null => {
    if (step === 1 && !selectedSupplier) return "اختر شركة التوصيل أولاً";
    if (step === 2 && (!sender.name || !sender.phone)) return "أدخل اسم ورقم المرسِل";
    if (step === 2 && (!receiver.name || !receiver.phone)) return "أدخل اسم ورقم المستلِم";
    if (step === 3 && !pickup.address) return "أدخل عنوان الاستلام";
    if (step === 3 && !delivery.address) return "أدخل عنوان التسليم";
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    goNext();
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" }); navigate("/login"); return; }
    const err = validateStep();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const svcLabel = SERVICE_TYPES.find(s => s.key === serviceType)?.label || serviceType;
      const sizeLabel = SIZES.find(s => s.key === item.size)?.label || item.size;
      const descParts = [
        `[نوع الخدمة: ${svcLabel}]`,
        `[الحجم: ${sizeLabel}]`,
        item.description && `[الوصف: ${item.description}]`,
        `[المرسِل: ${sender.name} - ${sender.phone}]`,
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
        delivery_address: delivery.address,
        delivery_lat: delivery.lat || undefined,
        delivery_lng: delivery.lng || undefined,
        delivery_landmark: delivery.landmark || undefined,
        recipient_name: receiver.name,
        recipient_phone: receiver.phone,
        item_description: descParts,
        item_weight: item.weight ? Number(item.weight) : undefined,
        item_dimensions: item.dimensions || undefined,
        payment_method: item.payment_method,
      } as any);

      if (result?.id) {
        await notifySupplier(selectedSupplier.user_id, result.id, sender.name || profile?.full_name || "عميل");
      }
      toast({ title: "✅ تم إرسال الطلب بنجاح!", description: "سيتم التواصل معك لتأكيد السعر." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ في الإرسال", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // ══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <div className="container mx-auto px-4 pt-4 pb-16 max-w-2xl">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={goPrev} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-black text-lg leading-none">طلب توصيل</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{STEP_LABELS[step - 1]}</p>
          </div>
          {selectedSupplier && (
            <div className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium shrink-0">
              <Truck className="w-3.5 h-3.5" />
              {selectedSupplier.full_name}
            </div>
          )}
        </div>

        {/* ── Step bar ── */}
        <StepBar step={step} />

        {/* ══════════════════════════════════════════════════
            STEP 1 — الخدمة، الشركة، والعروض
        ══════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-4">

            {/* Service type */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> نوع الخدمة
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_TYPES.map(s => {
                    const Icon = s.icon;
                    return (
                      <button key={s.key} onClick={() => setServiceType(s.key)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                          serviceType === s.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" />{s.label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Company search + list */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" /> اختر شركة التوصيل *
                </p>

                <div className="relative mb-3">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="ابحث عن شركة..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pr-9 h-9" />
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1,2].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
                  </div>
                ) : filtered.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {filtered.map((s: any) => {
                      const areas = workingAreas[s.user_id] || [];
                      const offers = companyOfferMap[s.user_id] || [];
                      const isSelected = selectedSupplier?.user_id === s.user_id;
                      return (
                        <button key={s.user_id} onClick={() => setSelectedSupplier(s)}
                          className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {s.logo_url ? (
                              <img src={s.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Truck className="w-5 h-5 text-primary" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{s.full_name}</span>
                                {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                              </div>
                              {s.city && <p className="text-xs text-muted-foreground"><MapPin className="w-2.5 h-2.5 inline mr-0.5" />{s.city}</p>}
                              <AverageRating revieweeId={s.user_id} />
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {areas.slice(0, 2).map((a: string) => (
                                  <span key={a} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{a}</span>
                                ))}
                                {areas.length > 2 && <span className="text-[9px] text-muted-foreground">+{areas.length - 2}</span>}
                                {offers.length > 0 && (
                                  <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Tag className="w-2 h-2" /> {offers.length} عرض
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    لا توجد شركات توصيل متاحة حالياً
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company offers (shown after company selected) */}
            {selectedSupplier && companyOffers.length > 0 && (
              <Card className="border-red-200 dark:border-red-900/50">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-red-500" />
                    عروض {selectedSupplier.full_name}
                    <span className="text-xs text-muted-foreground font-normal">(اختر عرضاً لتطبيقه)</span>
                  </p>
                  <div className="space-y-2">
                    {companyOffers.map(offer => {
                      const isSelected = selectedOffer?.id === offer.id;
                      const label =
                        offer.offer_type === "free_delivery" ? "توصيل مجاني" :
                        offer.offer_type === "percent_off_delivery" ? `خصم ${offer.discount_percent}%` :
                        `خصم ${offer.discount_amount?.toLocaleString()} ر.ي`;
                      return (
                        <button key={offer.id} onClick={() => setSelectedOffer(isSelected ? null : offer)}
                          className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                            isSelected ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-border hover:border-red-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-sm">{offer.title}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
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
                            {isSelected
                              ? <CheckCircle className="w-5 h-5 text-red-500 shrink-0" />
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

            <Button className="w-full h-12 text-base" onClick={handleNext} disabled={!selectedSupplier}>
              التالي — معلومات الأطراف
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            </Button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 2 — المرسِل والمستلِم
        ══════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4">

            {/* Who are you */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" /> أنت في هذا الطلب؟
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "sender",   label: "أنا المرسِل",  emoji: "📤" },
                    { key: "receiver", label: "أنا المستلِم", emoji: "📥" },
                    { key: "third",    label: "طرف آخر",      emoji: "🔄" },
                  ] as const).map(r => (
                    <button key={r.key} onClick={() => setUserRole(r.key)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        userRole === r.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <span className="text-2xl">{r.emoji}</span>{r.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sender */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    المرسِل — جهة الإرسال
                  </p>
                  {userRole === "sender" && (
                    <Badge variant="secondary" className="text-[10px] py-0 gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> أنت
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الاسم *</Label>
                    <Input value={sender.name} onChange={e => setSender(s => ({ ...s, name: e.target.value }))} placeholder="اسم المرسِل" className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">الهاتف *</Label>
                    <Input value={sender.phone} onChange={e => setSender(s => ({ ...s, phone: e.target.value }))} placeholder="7XX XXX XXX" className="h-9 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receiver */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    المستلِم — جهة التسليم
                  </p>
                  {userRole === "receiver" && (
                    <Badge variant="secondary" className="text-[10px] py-0 gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" /> أنت
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">الاسم *</Label>
                    <Input value={receiver.name} onChange={e => setReceiver(r => ({ ...r, name: e.target.value }))} placeholder="اسم المستلِم" className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">الهاتف *</Label>
                    <Input value={receiver.phone} onChange={e => setReceiver(r => ({ ...r, phone: e.target.value }))} placeholder="7XX XXX XXX" className="h-9 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11" onClick={goPrev}>
                <ArrowRight className="w-4 h-4 ml-1" /> السابق
              </Button>
              <Button className="h-11" onClick={handleNext}>
                التالي <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3 — العناوين والخريطة
        ══════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">

            {/* Pickup */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  عنوان الاستلام (من أين؟) *
                </p>
                {userRole === "sender" && (
                  <AddressSelector
                    label="اختر من عناوينك المحفوظة"
                    onSelect={(addr: SelectedAddress | null) => {
                      if (!addr) return;
                      setPickup({ address: addr.full_address, lat: addr.latitude || 0, lng: addr.longitude || 0, landmark: addr.landmark || "" });
                      if (addr.phone) setSender(s => ({ ...s, phone: addr.phone! }));
                    }}
                    showUseMyLocation
                    onUseMyLocation={(lat, lng) => setPickup(p => ({ ...p, lat, lng }))}
                  />
                )}
                <Input value={pickup.address} onChange={e => setPickup(p => ({ ...p, address: e.target.value }))}
                  placeholder="أدخل عنوان الاستلام..." className="h-9" />
                <Input value={pickup.landmark} onChange={e => setPickup(p => ({ ...p, landmark: e.target.value }))}
                  placeholder="أقرب معلم (اختياري)" className="h-9" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">📍 تحديد الموقع على الخريطة</p>
                  <MapPicker lat={pickup.lat || undefined} lng={pickup.lng || undefined}
                    onLocationSelect={(lat, lng) => setPickup(p => ({ ...p, lat, lng }))} height="180px" />
                </div>
                {pickup.lat !== 0 && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> تم تحديد الموقع بنجاح</p>}
              </CardContent>
            </Card>

            {/* Delivery */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  عنوان التسليم (إلى أين؟) *
                </p>
                {userRole === "receiver" && (
                  <AddressSelector
                    label="اختر من عناوينك المحفوظة"
                    onSelect={(addr: SelectedAddress | null) => {
                      if (!addr) return;
                      setDelivery({ address: addr.full_address, lat: addr.latitude || 0, lng: addr.longitude || 0, landmark: addr.landmark || "" });
                      if (addr.phone) setReceiver(r => ({ ...r, phone: addr.phone! }));
                    }}
                    showUseMyLocation
                    onUseMyLocation={(lat, lng) => setDelivery(d => ({ ...d, lat, lng }))}
                  />
                )}
                <Input value={delivery.address} onChange={e => setDelivery(d => ({ ...d, address: e.target.value }))}
                  placeholder="أدخل عنوان التسليم..." className="h-9" />
                <Input value={delivery.landmark} onChange={e => setDelivery(d => ({ ...d, landmark: e.target.value }))}
                  placeholder="أقرب معلم (اختياري)" className="h-9" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">📍 تحديد الموقع على الخريطة</p>
                  <MapPicker lat={delivery.lat || undefined} lng={delivery.lng || undefined}
                    onLocationSelect={(lat, lng) => setDelivery(d => ({ ...d, lat, lng }))} height="180px" />
                </div>
                {delivery.lat !== 0 && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> تم تحديد الموقع بنجاح</p>}
              </CardContent>
            </Card>

            {/* Live distance estimate */}
            {distanceKm !== null && estimatedFee !== null && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-primary" />
                    المسافة: <strong className="text-foreground">{distanceKm.toFixed(1)} كم</strong>
                  </span>
                  <span className="font-bold text-primary">
                    ~{(finalFee ?? estimatedFee).toLocaleString()} ر.ي
                    {selectedOffer && <span className="text-[10px] font-normal text-green-600 mr-1">(بعد الخصم)</span>}
                  </span>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11" onClick={goPrev}>
                <ArrowRight className="w-4 h-4 ml-1" /> السابق
              </Button>
              <Button className="h-11" onClick={handleNext}>
                التالي <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 4 — تفاصيل الطرد وتأكيد الطلب
        ══════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-4">

            {/* Item details */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> تفاصيل الطرد
                </p>

                <div>
                  <Label className="text-xs">ما الذي تريد توصيله؟</Label>
                  <Textarea
                    value={item.description}
                    onChange={e => setItem(i => ({ ...i, description: e.target.value }))}
                    placeholder={
                      serviceType === "parcel" ? "مثال: ملابس، أجهزة إلكترونية..." :
                      serviceType === "shopping" ? "مثال: اشترِ من الصيدلية: باراسيتامول..." :
                      "مثال: وجبة من مطعم الشاطئ..."
                    }
                    rows={3}
                    className="resize-none mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-2 block">حجم الطرد</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map(sz => (
                      <button key={sz.key} onClick={() => setItem(i => ({ ...i, size: sz.key }))}
                        className={`flex flex-col items-center py-2.5 rounded-lg border-2 text-xs transition-all ${
                          item.size === sz.key ? "border-primary bg-primary/10 text-primary" : "border-border"
                        }`}
                      >
                        <span className="font-bold">{sz.label}</span>
                        <span className="text-[10px] opacity-60">{sz.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Weight className="w-3 h-3" /> الوزن (كجم)</Label>
                    <Input type="number" value={item.weight} onChange={e => setItem(i => ({ ...i, weight: e.target.value }))} placeholder="مثال: 2" className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">الأبعاد</Label>
                    <Input value={item.dimensions} onChange={e => setItem(i => ({ ...i, dimensions: e.target.value }))} placeholder="30×20×10 سم" className="h-9 mt-1" />
                  </div>
                </div>

                <div>
                  <Label className="text-xs flex items-center gap-1 mb-1"><ImageIcon className="w-3 h-3" /> صورة الطرد (اختياري)</Label>
                  <ImageUpload value={item.image_url} onChange={url => setItem(i => ({ ...i, image_url: url }))} bucket="restaurant-images" folder="shipments" />
                </div>

                <div>
                  <Label className="text-xs">ملاحظات إضافية</Label>
                  <Input value={item.notes} onChange={e => setItem(i => ({ ...i, notes: e.target.value }))} placeholder="أي تعليمات..." className="h-9 mt-1" />
                </div>

                <div>
                  <Label className="text-xs">طريقة الدفع</Label>
                  <Select value={item.payment_method} onValueChange={v => setItem(i => ({ ...i, payment_method: v }))}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
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
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-primary" /> ملخص التسعير
                </p>
                {distanceKm !== null && estimatedFee !== null ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">المسافة</span>
                      <span className="font-medium">{distanceKm.toFixed(1)} كم</span>
                    </div>
                    {pricePerKm > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">سعر الكيلومتر</span>
                        <span>{pricePerKm.toLocaleString()} ر.ي</span>
                      </div>
                    )}
                    {selectedOffer && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> {selectedOffer.title}</span>
                        <span>{selectedOffer.offer_type === "free_delivery" ? "مجاني" :
                               selectedOffer.offer_type === "percent_off_delivery" ? `-${selectedOffer.discount_percent}%` :
                               `-${selectedOffer.discount_amount?.toLocaleString()} ر.ي`}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>التقدير المبدئي</span>
                      <span className="text-primary">{(finalFee ?? estimatedFee).toLocaleString()} ر.ي</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">* السعر النهائي يُؤكَّد من شركة التوصيل</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {pricePerKm > 0 ? "حدد المواقع على الخريطة لحساب السعر" : "سيصلك سعر من شركة التوصيل بعد الإرسال"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Order summary */}
            <Card>
              <CardContent className="p-4 space-y-1.5 text-sm">
                <p className="font-semibold mb-2">📋 ملخص الطلب</p>
                <div className="flex justify-between"><span className="text-muted-foreground">الشركة</span><span className="font-medium">{selectedSupplier?.full_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">نوع الخدمة</span><span>{SERVICE_TYPES.find(s => s.key === serviceType)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المرسِل</span><span>{sender.name} ({sender.phone})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المستلِم</span><span>{receiver.name} ({receiver.phone})</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">من</span><span className="text-left text-xs truncate">{pickup.address}</span></div>
                <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">إلى</span><span className="text-left text-xs truncate">{delivery.address}</span></div>
                {selectedOffer && (
                  <div className="flex justify-between text-green-600">
                    <span>العرض المطبّق</span><span className="text-right text-xs">{selectedOffer.title}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-12" onClick={goPrev}>
                <ArrowRight className="w-4 h-4 ml-1" /> السابق
              </Button>
              <Button className="h-12 text-base gap-2" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  : <><Package className="w-5 h-5" />{finalFee !== null ? `اطلب — ~${finalFee.toLocaleString()} ر.ي` : "إرسال الطلب"}</>}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ShipmentsPage;
