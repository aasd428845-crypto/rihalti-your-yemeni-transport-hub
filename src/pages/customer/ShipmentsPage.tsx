import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Package, Truck, User, Phone, MapPin, FileText,
  Weight, Search, Globe, ShoppingBag, UtensilsCrossed,
  ArrowRight, Navigation, CheckCircle, ImageIcon, ChevronLeft,
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

// ─── Service types ───────────────────────────────────────────
const SERVICE_TYPES = [
  { key: "parcel",   label: "نقل طرد",       icon: Package,         color: "bg-blue-500"   },
  { key: "shopping", label: "تسوق من متجر",  icon: ShoppingBag,     color: "bg-purple-500" },
  { key: "meal",     label: "توصيل وجبة",    icon: UtensilsCrossed, color: "bg-orange-500" },
];

// ─── Item sizes ───────────────────────────────────────────────
const SIZES = [
  { key: "small",  label: "صغير",  desc: "كيس / علبة صغيرة" },
  { key: "medium", label: "متوسط", desc: "حقيبة / صندوق متوسط" },
  { key: "large",  label: "كبير",  desc: "صندوق كبير / أثاث" },
];

type UserRole = "sender" | "receiver" | "third";

const ShipmentsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [workingAreas, setWorkingAreas] = useState<Record<string, string[]>>({});

  // ── Service & role ──
  const [serviceType, setServiceType] = useState("parcel");
  const [userRole, setUserRole] = useState<UserRole>("sender");

  // ── Sender info ──
  const [sender, setSender] = useState({ name: "", phone: "" });

  // ── Receiver info ──
  const [receiver, setReceiver] = useState({ name: "", phone: "" });

  // ── Addresses ──
  const [pickup, setPickup] = useState({
    address: "", lat: 0, lng: 0, landmark: "",
  });
  const [delivery, setDelivery] = useState({
    address: "", lat: 0, lng: 0, landmark: "",
  });

  // ── Item details ──
  const [item, setItem] = useState({
    description: "", size: "medium", weight: "", dimensions: "",
    image_url: "", notes: "", payment_method: "cash",
  });

  // ── Pricing ──
  const [pricePerKm, setPricePerKm] = useState(0);

  // Auto-fill sender/receiver from user profile when role changes
  useEffect(() => {
    if (!profile) return;
    if (userRole === "sender") {
      setSender({ name: profile.full_name || "", phone: profile.phone || "" });
    } else if (userRole === "receiver") {
      setReceiver({ name: profile.full_name || "", phone: profile.phone || "" });
    }
  }, [userRole, profile]);

  // Fetch supplier's price_per_km when selected
  useEffect(() => {
    if (!selectedSupplier?.user_id) return;
    supabase
      .from("partner_settings" as any)
      .select("price_per_km")
      .eq("partner_id", selectedSupplier.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPricePerKm(Number((data as any).price_per_km ?? 0));
      });
  }, [selectedSupplier]);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

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
    if (
      pricePerKm > 0 &&
      pickup.lat !== 0 && pickup.lng !== 0 &&
      delivery.lat !== 0 && delivery.lng !== 0
    ) {
      const result = calcDistanceDeliveryFee(
        pickup.lat, pickup.lng,
        delivery.lat, delivery.lng,
        pricePerKm, 0
      );
      return { estimatedFee: result.fee, distanceKm: result.distanceKm };
    }
    return { estimatedFee: null, distanceKm: null };
  }, [pickup.lat, pickup.lng, delivery.lat, delivery.lng, pricePerKm]);

  const handlePickupSelect = (addr: SelectedAddress | null) => {
    if (!addr) return;
    setPickup({
      address: addr.full_address,
      lat: addr.latitude || 0,
      lng: addr.longitude || 0,
      landmark: addr.landmark || "",
    });
    // Auto-fill sender phone if user is sender
    if (userRole === "sender" && addr.phone) {
      setSender(s => ({ ...s, phone: addr.phone! }));
    }
  };

  const handleDeliverySelect = (addr: SelectedAddress | null) => {
    if (!addr) return;
    setDelivery({
      address: addr.full_address,
      lat: addr.latitude || 0,
      lng: addr.longitude || 0,
      landmark: addr.landmark || "",
    });
    // Auto-fill receiver phone if user is receiver
    if (userRole === "receiver" && addr.phone) {
      setReceiver(r => ({ ...r, phone: addr.phone! }));
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" }); navigate("/login"); return; }
    if (!pickup.address) { toast({ title: "أدخل عنوان الاستلام", variant: "destructive" }); return; }
    if (!delivery.address) { toast({ title: "أدخل عنوان التسليم", variant: "destructive" }); return; }
    if (!sender.name || !sender.phone) { toast({ title: "أدخل معلومات المرسِل", variant: "destructive" }); return; }
    if (!receiver.name || !receiver.phone) { toast({ title: "أدخل معلومات المستلِم", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      // Encode sender info + service type in notes/description
      const enrichedDescription = [
        `[نوع الخدمة: ${SERVICE_TYPES.find(s => s.key === serviceType)?.label}]`,
        `[الحجم: ${SIZES.find(s => s.key === item.size)?.label}]`,
        item.description ? `[الوصف: ${item.description}]` : "",
        `[المرسِل: ${sender.name} - ${sender.phone}]`,
      ].filter(Boolean).join(" ");

      const enrichedNotes = [
        item.notes,
        item.image_url ? `[صورة الطرد: ${item.image_url}]` : "",
      ].filter(Boolean).join("\n");

      await createShipmentRequest({
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

      toast({ title: "✅ تم إرسال الطلب بنجاح!", description: "سيتم التواصل معك لتأكيد السعر." });
      navigate("/history");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // ── Company selection screen ───────────────────────────────
  if (step === "select") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container mx-auto px-4 pt-6 pb-16 max-w-2xl">
          <BackButton />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground mb-1">خدمة التوصيل والشحن</h1>
            <p className="text-muted-foreground text-sm">اختر شركة التوصيل لإرسال ما تريد</p>
          </div>

          {/* Service type tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6">
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
          <div className="relative mb-5">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="ابحث عن شركة توصيل..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10" />
          </div>

          {/* Company cards */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-24" /></Card>)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((s: any) => {
                const areas = workingAreas[s.user_id] || [];
                return (
                  <Card
                    key={s.user_id}
                    className="hover:shadow-md transition-all cursor-pointer hover:border-primary"
                    onClick={() => { setSelectedSupplier(s); setStep("form"); }}
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
                          {areas.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Globe className="w-3 h-3 text-muted-foreground mt-0.5" />
                              {areas.slice(0, 3).map((a: string) => (
                                <span key={a} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{a}</span>
                              ))}
                              {areas.length > 3 && <span className="text-[10px] text-muted-foreground">+{areas.length - 3}</span>}
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

  // ── Request form ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <div className="container mx-auto px-4 pt-6 pb-16 max-w-2xl space-y-4">

        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep("select")} className="shrink-0">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">طلب توصيل</h1>
            <p className="text-xs text-muted-foreground">{selectedSupplier?.full_name}</p>
          </div>
        </div>

        {/* ── Service type tabs ── */}
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_TYPES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => setServiceType(s.key)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition-all ${
                      serviceType === s.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-muted text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Who are you? ── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> أنت في هذا الطلب؟
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "sender",   label: "أنا المرسِل",  icon: "📤" },
                { key: "receiver", label: "أنا المستلِم", icon: "📥" },
                { key: "third",    label: "طرف آخر",      icon: "🔄" },
              ] as const).map((r) => (
                <button
                  key={r.key}
                  onClick={() => setUserRole(r.key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    userRole === r.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <span className="text-xl">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Sender info ── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                معلومات المرسِل (جهة الإرسال)
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
                <Input
                  value={sender.name}
                  onChange={e => setSender(s => ({ ...s, name: e.target.value }))}
                  placeholder="اسم المرسِل"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">الهاتف *</Label>
                <Input
                  value={sender.phone}
                  onChange={e => setSender(s => ({ ...s, phone: e.target.value }))}
                  placeholder="7XX XXX XXX"
                  className="h-9"
                />
              </div>
            </div>

            {/* Pickup address */}
            <Separator className="my-1" />
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> عنوان الاستلام (من)
            </p>
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
              <p className="text-xs text-muted-foreground mb-1.5">تحديد الموقع على الخريطة</p>
              <MapPicker
                lat={pickup.lat || undefined}
                lng={pickup.lng || undefined}
                onLocationSelect={(lat, lng) => setPickup(p => ({ ...p, lat, lng }))}
                height="180px"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Receiver info ── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                معلومات المستلِم (جهة التسليم)
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
                <Input
                  value={receiver.name}
                  onChange={e => setReceiver(r => ({ ...r, name: e.target.value }))}
                  placeholder="اسم المستلِم"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">الهاتف *</Label>
                <Input
                  value={receiver.phone}
                  onChange={e => setReceiver(r => ({ ...r, phone: e.target.value }))}
                  placeholder="7XX XXX XXX"
                  className="h-9"
                />
              </div>
            </div>

            {/* Delivery address */}
            <Separator className="my-1" />
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> عنوان التسليم (إلى)
            </p>
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
              <p className="text-xs text-muted-foreground mb-1.5">تحديد الموقع على الخريطة</p>
              <MapPicker
                lat={delivery.lat || undefined}
                lng={delivery.lng || undefined}
                onLocationSelect={(lat, lng) => setDelivery(d => ({ ...d, lat, lng }))}
                height="180px"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Item details ── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> تفاصيل الطرد
            </h3>

            {/* Description */}
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
                <Input
                  type="number"
                  value={item.weight}
                  onChange={e => setItem(i => ({ ...i, weight: e.target.value }))}
                  placeholder="مثال: 2"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">الأبعاد (اختياري)</Label>
                <Input
                  value={item.dimensions}
                  onChange={e => setItem(i => ({ ...i, dimensions: e.target.value }))}
                  placeholder="30×20×10 سم"
                  className="h-9"
                />
              </div>
            </div>

            {/* Optional image */}
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
              <Input
                value={item.notes}
                onChange={e => setItem(i => ({ ...i, notes: e.target.value }))}
                placeholder="أي تعليمات إضافية..."
                className="h-9"
              />
            </div>

            {/* Payment */}
            <div>
              <Label className="text-xs">طريقة الدفع</Label>
              <Select value={item.payment_method} onValueChange={v => setItem(i => ({ ...i, payment_method: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً عند الاستلام</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Price estimate ── */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" /> تقدير السعر
            </h3>
            {distanceKm !== null && estimatedFee !== null ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المسافة التقريبية</span>
                  <span className="font-medium">{distanceKm.toFixed(1)} كم</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">سعر الكيلومتر</span>
                  <span className="font-medium">{pricePerKm.toLocaleString()} ر.ي/كم</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>التقدير المبدئي</span>
                  <span className="text-primary text-lg">{estimatedFee.toLocaleString()} ر.ي</span>
                </div>
                <p className="text-[11px] text-muted-foreground">* السعر النهائي يتم تأكيده من شركة التوصيل</p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>حدد موقع الاستلام والتسليم على الخريطة لحساب السعر تلقائياً</p>
                {pricePerKm === 0 && (
                  <p className="text-xs">سيتم إرسال تسعيرة من شركة التوصيل بعد تقديم الطلب</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Submit ── */}
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
              {estimatedFee !== null
                ? `اطلب الآن — ${estimatedFee.toLocaleString()} ر.ي`
                : "إرسال طلب التوصيل"}
            </>
          )}
        </Button>

      </div>
    </div>
  );
};

export default ShipmentsPage;
