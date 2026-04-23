import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Package, ShoppingBag, UtensilsCrossed, Loader2, Send, CheckCircle, Clock, Banknote, Link as LinkIcon, User, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useServiceRequests } from "@/hooks/useServiceRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import MapPicker from "@/components/maps/MapPicker";
import { haversineDistance } from "@/lib/distanceUtils";
import { YEMENI_CITIES } from "@/lib/contactFilter";

type Step = 1 | 2 | 3 | 4;
type Subtype = "parcel" | "shop" | "meal";

const subtypes: { id: Subtype; label: string; icon: any }[] = [
  { id: "parcel", label: "نقل طرد", icon: Package },
  { id: "shop", label: "تسوق من متجر", icon: ShoppingBag },
  { id: "meal", label: "توصيل وجبة", icon: UtensilsCrossed },
];

const sizes = [
  { id: "small", label: "صغير", hint: "حقيبة يد" },
  { id: "medium", label: "متوسط", hint: "كرتون متوسط" },
  { id: "large", label: "كبير", hint: "أثاث / عدة كراتين" },
];

const DEFAULT_PRICE_PER_KM = 200; // ر.ي/كم – fallback
const DEFAULT_MIN_FEE = 500;       // ر.ي
const SPEED_KMH = 25;              // متوسط سرعة في المدينة لتقدير الزمن

function tryParseMapLink(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  // Google Maps @lat,lng
  const at = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  // q=lat,lng or ?ll=lat,lng or /place/lat,lng
  const q = text.match(/[?&](?:q|ll|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  // Bare "lat,lng"
  const bare = text.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (bare) return { lat: parseFloat(bare[1]), lng: parseFloat(bare[2]) };
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`,
      { headers: { "Accept-Language": "ar" } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.display_name || null;
  } catch {
    return null;
  }
}

export default function DeliveryRequestPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { createRequest } = useServiceRequests();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [subtype, setSubtype] = useState<Subtype>("parcel");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Pickup
  const [fromCity, setFromCity] = useState<string>("");
  const [fromLat, setFromLat] = useState<number | undefined>();
  const [fromLng, setFromLng] = useState<number | undefined>();
  const [fromAddress, setFromAddress] = useState<string>("");
  const [fromLink, setFromLink] = useState<string>("");

  // Dropoff
  const [toCity, setToCity] = useState<string>("");
  const [toLat, setToLat] = useState<number | undefined>();
  const [toLng, setToLng] = useState<number | undefined>();
  const [toAddress, setToAddress] = useState<string>("");
  const [toLink, setToLink] = useState<string>("");

  // Details
  const [description, setDescription] = useState<string>("");
  const [size, setSize] = useState<string>("medium");
  const [notes, setNotes] = useState<string>("");

  // Sender / Receiver
  const [iAmSender, setIAmSender] = useState(true);
  const [senderName, setSenderName] = useState<string>("");
  const [senderPhone, setSenderPhone] = useState<string>("");
  const [receiverName, setReceiverName] = useState<string>("");
  const [receiverPhone, setReceiverPhone] = useState<string>("");

  // Pricing
  const [pricePerKm, setPricePerKm] = useState<number>(DEFAULT_PRICE_PER_KM);
  const [minFee, setMinFee] = useState<number>(DEFAULT_MIN_FEE);

  // Prefill from profile + default address + average per-km from delivery companies
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: addr } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("customer_id", user.id)
          .eq("is_default", true)
          .maybeSingle();
        if (addr) {
          setFromCity(addr.city || "");
          setFromAddress(
            [addr.district, addr.street, addr.building_number, addr.landmark].filter(Boolean).join("، ")
          );
          if (addr.latitude && addr.longitude) {
            setFromLat(Number(addr.latitude));
            setFromLng(Number(addr.longitude));
          }
        } else if (profile?.city) {
          setFromCity(profile.city);
        }
      } catch (e) {
        console.error(e);
      }

      try {
        const { data } = await supabase
          .from("partner_settings" as any)
          .select("price_per_km, min_delivery_fee");
        const rows = ((data as any[]) || []).filter((r) => Number(r.price_per_km) > 0);
        if (rows.length) {
          const avg = rows.reduce((s, r) => s + Number(r.price_per_km), 0) / rows.length;
          setPricePerKm(Math.ceil(avg));
          const mins = rows.map((r) => Number(r.min_delivery_fee || 0)).filter((n) => n > 0);
          if (mins.length) setMinFee(Math.min(...mins));
        }
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-fill sender from profile
  useEffect(() => {
    if (iAmSender) {
      setSenderName(profile?.full_name || "");
      setSenderPhone(profile?.phone || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iAmSender, profile?.full_name, profile?.phone]);

  // Reverse-geocode pickup when coords change and address empty
  useEffect(() => {
    if (fromLat == null || fromLng == null) return;
    if (fromAddress) return;
    reverseGeocode(fromLat, fromLng).then((name) => name && setFromAddress(name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLat, fromLng]);

  useEffect(() => {
    if (toLat == null || toLng == null) return;
    if (toAddress) return;
    reverseGeocode(toLat, toLng).then((name) => name && setToAddress(name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toLat, toLng]);

  const distanceKm = useMemo(() => {
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) return 0;
    return haversineDistance(fromLat, fromLng, toLat, toLng);
  }, [fromLat, fromLng, toLat, toLng]);

  const sizeMultiplier = size === "large" ? 1.4 : size === "small" ? 0.9 : 1;
  const estimatedFee = useMemo(() => {
    if (distanceKm <= 0) return 0;
    const raw = distanceKm * pricePerKm * sizeMultiplier;
    return Math.max(minFee, Math.ceil(raw));
  }, [distanceKm, pricePerKm, sizeMultiplier, minFee]);
  const etaMinutes = useMemo(() => {
    if (distanceKm <= 0) return 0;
    const drive = (distanceKm / SPEED_KMH) * 60;
    return Math.max(15, Math.round(drive + 15)); // +15min handover
  }, [distanceKm]);

  const handleFromLink = () => {
    const p = tryParseMapLink(fromLink.trim());
    if (!p) { toast({ title: "رابط غير صالح", description: "ألصق رابط من خرائط Google", variant: "destructive" }); return; }
    setFromLat(p.lat); setFromLng(p.lng); setFromAddress("");
  };
  const handleToLink = () => {
    const p = tryParseMapLink(toLink.trim());
    if (!p) { toast({ title: "رابط غير صالح", description: "ألصق رابط من خرائط Google", variant: "destructive" }); return; }
    setToLat(p.lat); setToLng(p.lng); setToAddress("");
  };

  const canNext = (s: Step) => {
    if (s === 1) return !!fromCity && fromLat != null && fromLng != null;
    if (s === 2) return !!toCity && toLat != null && toLng != null;
    if (s === 3) return description.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) { toast({ title: "يجب تسجيل الدخول", variant: "destructive" }); return; }
    if (!canNext(1) || !canNext(2) || !canNext(3)) {
      toast({ title: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createRequest({
        type: "delivery",
        from_city: fromCity,
        to_city: toCity,
        from_address: fromAddress,
        to_address: toAddress,
        description,
        notes,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        sender_name: senderName,
        sender_phone: senderPhone,
        from_lat: fromLat,
        from_lng: fromLng,
        to_lat: toLat,
        to_lng: toLng,
        distance_km: Number(distanceKm.toFixed(2)),
        estimated_price: estimatedFee,
        service_subtype: subtype,
        package_size: size,
      });
      setDone(true);
    } catch (e: any) {
      toast({ title: "تعذّر إرسال الطلب", description: e?.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 mx-auto flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">تم إرسال طلبك! ✅</h2>
            <p className="text-muted-foreground text-sm leading-7">
              السعر التقديري <span className="font-bold text-foreground">{estimatedFee.toLocaleString("ar-YE")} ر.ي</span> لمسافة {distanceKm.toFixed(1)} كم.
              <br />سيتواصل معك أقرب مندوب بعد قبول الطلب.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/history")} className="w-full">تتبّع طلبي</Button>
            <Button variant="outline" onClick={() => { setDone(false); setStep(1); }}>طلب جديد</Button>
          </div>
        </div>
      </div>
    );
  }

  const StepDot = ({ n, label }: { n: Step; label: string }) => (
    <div className="flex items-center gap-2 flex-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</div>
      <span className={`text-xs ${step >= n ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => (step === 1 ? navigate(-1) : setStep((step - 1) as Step))}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">طلب توصيل</h1>
        </div>
        {/* Subtype tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {subtypes.map((s) => (
            <button key={s.id} onClick={() => setSubtype(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition ${subtype === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-transparent"}`}>
              <s.icon className="w-4 h-4" /> {s.label}
            </button>
          ))}
        </div>
        {/* Stepper */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex items-center gap-2">
          <StepDot n={1} label="الاستلام" />
          <StepDot n={2} label="التسليم" />
          <StepDot n={3} label="التفاصيل" />
          <StepDot n={4} label="المراجعة" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* STEP 1 — PICKUP */}
        {step === 1 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="font-bold">من أين؟</h2>
              </div>
              <div>
                <Label className="text-xs">مدينة الاستلام *</Label>
                <select value={fromCity} onChange={(e) => setFromCity(e.target.value)}
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">اختر المدينة</option>
                  {YEMENI_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Input value={fromLink} onChange={(e) => setFromLink(e.target.value)} placeholder="ألصق رابط الموقع من Google Maps" className="flex-1" />
                <Button type="button" variant="outline" onClick={handleFromLink} className="gap-1"><LinkIcon className="w-4 h-4" />استخدم</Button>
              </div>
              <MapPicker lat={fromLat} lng={fromLng} onLocationSelect={(la, ln) => { setFromLat(la); setFromLng(ln); setFromAddress(""); }} height="240px" />
              <div>
                <Label className="text-xs">العنوان التفصيلي (اختياري)</Label>
                <Input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="الحي / الشارع / المعلم" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2 — DROPOFF */}
        {step === 2 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                <h2 className="font-bold">إلى أين؟</h2>
              </div>
              <div>
                <Label className="text-xs">مدينة التسليم *</Label>
                <select value={toCity} onChange={(e) => setToCity(e.target.value)}
                  className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">اختر المدينة</option>
                  {YEMENI_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Input value={toLink} onChange={(e) => setToLink(e.target.value)} placeholder="ألصق رابط الموقع من Google Maps" className="flex-1" />
                <Button type="button" variant="outline" onClick={handleToLink} className="gap-1"><LinkIcon className="w-4 h-4" />استخدم</Button>
              </div>
              <MapPicker lat={toLat} lng={toLng} onLocationSelect={(la, ln) => { setToLat(la); setToLng(ln); setToAddress(""); }} height="240px" />
              <div>
                <Label className="text-xs">العنوان التفصيلي (اختياري)</Label>
                <Input value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="الحي / الشارع / المعلم" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3 — DETAILS */}
        {step === 3 && (
          <>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  <h2 className="font-bold">تفاصيل الطلب</h2>
                </div>
                <div>
                  <Label className="text-xs">
                    {subtype === "shop" ? "ما الذي تريد شراءه؟ *" : subtype === "meal" ? "تفاصيل الوجبة *" : "ما الذي تريد توصيله؟ *"}
                  </Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                    placeholder={subtype === "shop" ? "مثال: 2 كرتون مياه، خبز، حليب..." : subtype === "meal" ? "مثال: وجبة عشاء من مطعم الشاطئ" : "مثال: ظرف مستندات، صندوق متوسط..."} />
                </div>
                <div>
                  <Label className="text-xs mb-2 block">الحجم</Label>
                  <div className="flex gap-2">
                    {sizes.map((s) => (
                      <button key={s.id} onClick={() => setSize(s.id)}
                        className={`flex-1 rounded-lg border p-3 text-center transition ${size === s.id ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}>
                        <div className="text-sm font-semibold">{s.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">ملاحظات إضافية (اختياري)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="أي تعليمات للمندوب..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold flex items-center gap-2"><User className="w-5 h-5 text-primary" /> أطراف الطلب</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIAmSender(true)}
                    className={`flex-1 rounded-lg border p-2 text-sm ${iAmSender ? "border-primary bg-primary/10" : "border-border"}`}>
                    أنا المرسل
                  </button>
                  <button onClick={() => setIAmSender(false)}
                    className={`flex-1 rounded-lg border p-2 text-sm ${!iAmSender ? "border-primary bg-primary/10" : "border-border"}`}>
                    أنا المستلم
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">اسم المرسل</Label>
                    <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">رقم المرسل</Label>
                    <Input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="7XXXXXXXX" />
                  </div>
                  <div>
                    <Label className="text-xs">اسم المستلم</Label>
                    <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">رقم المستلم</Label>
                    <Input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="7XXXXXXXX" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> الأرقام محجوبة عن المندوب حتى قبول السعر.</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* STEP 4 — REVIEW */}
        {step === 4 && (
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <h2 className="font-bold mb-2">مراجعة الطلب</h2>
              <Row k="نوع الخدمة" v={subtypes.find((s) => s.id === subtype)?.label || ""} />
              <Row k="من" v={`${fromCity}${fromAddress ? " — " + fromAddress : ""}`} />
              <Row k="إلى" v={`${toCity}${toAddress ? " — " + toAddress : ""}`} />
              <Row k="الوصف" v={description} />
              <Row k="الحجم" v={sizes.find((s) => s.id === size)?.label || ""} />
              {notes && <Row k="ملاحظات" v={notes} />}
              <Row k="المرسل" v={`${senderName || "-"} ${senderPhone ? "(" + senderPhone + ")" : ""}`} />
              <Row k="المستلم" v={`${receiverName || "-"} ${receiverPhone ? "(" + receiverPhone + ")" : ""}`} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky footer: estimate + action */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t z-30">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {distanceKm > 0 ? (
            <div className="flex items-center justify-between mb-2 text-sm">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-500" />
                <span className="font-bold">{estimatedFee.toLocaleString("ar-YE")} ر.ي</span>
                <span className="text-muted-foreground text-xs">({distanceKm.toFixed(1)} كم)</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Clock className="w-3.5 h-3.5" /> {etaMinutes} دقيقة تقريباً
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-2 text-center">حدّد موقعي الاستلام والتسليم لعرض السعر التقديري</p>
          )}
          {step < 4 ? (
            <Button className="w-full" disabled={!canNext(step)} onClick={() => setStep((step + 1) as Step)}>
              {canNext(step) ? "التالي" : (step === 1 ? "حدّد موقع الاستلام" : step === 2 ? "حدّد موقع التسليم" : "أكمل التفاصيل")}
            </Button>
          ) : (
            <Button className="w-full gap-2" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "جاري الإرسال..." : "اطلب الآن"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b last:border-0">
      <span className="text-muted-foreground text-xs shrink-0">{k}</span>
      <span className="text-sm text-end">{v}</span>
    </div>
  );
}
