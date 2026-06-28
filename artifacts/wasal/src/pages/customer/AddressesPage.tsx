import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAddresses, createAddress, deleteAddress, updateAddress } from "@/lib/customerApi";
import {
  fetchActiveCoverageZones,
  findZoneForLocation,
  SELECTED_CITY_KEY,
  type CoverageZone,
} from "@/lib/coverageApi";

import BackButton from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Plus, Trash2, Star, Phone, Navigation,
  Building2, Pencil, Loader2, WifiOff, ArrowRight, User,
} from "lucide-react";
import { getPhoneError, formatYemeniPhone } from "@/lib/phoneValidation";
import MapPicker from "@/components/maps/MapPicker";

type FormStep = 1 | 2;

const AddressesPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";
  const returnTo  = searchParams.get("from") || null;
  const { toast } = useToast();

  const [addresses, setAddresses]         = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [saving, setSaving]               = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [step, setStep]                   = useState<FormStep>(1);

  // Coverage zones
  const [coverageZones, setCoverageZones] = useState<CoverageZone[]>([]);
  const [zonesLoading, setZonesLoading]   = useState(true);
  const [outsideZone, setOutsideZone]     = useState(false);
  const [coverageChecked, setCoverageChecked] = useState(false);

  // Form state
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formName, setFormName]         = useState("");
  const [formCity, setFormCity]         = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formStreet, setFormStreet]     = useState("");
  const [formBuilding, setFormBuilding] = useState("");
  const [formLandmark, setFormLandmark] = useState("");
  const [formDefault, setFormDefault]   = useState(false);
  const [formPhone, setFormPhone]       = useState("");
  const [phoneSource, setPhoneSource]   = useState("primary");
  const [formLat, setFormLat]           = useState<number | undefined>();
  const [formLng, setFormLng]           = useState<number | undefined>();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user]);

  const load = async () => {
    if (!user) return;
    try {
      const data = await fetchAddresses(user.id);
      setAddresses(data || []);
    } catch { }
    setLoading(false);
  };

  const loadZones = useCallback(async () => {
    setZonesLoading(true);
    const z = await fetchActiveCoverageZones();
    setCoverageZones(z);
    setZonesLoading(false);
    return z;
  }, []);

  useEffect(() => { load(); }, [user?.id]);
  useEffect(() => { loadZones(); }, []);

  useEffect(() => {
    if ((isWelcome || returnTo) && !loading) {
      resetForm();
      setShowForm(true);
    }
  }, [isWelcome, returnTo, loading]);

  // When map pin changes → auto-detect zone
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setFormLat(lat);
    setFormLng(lng);
    setCoverageChecked(true);

    const hasGeo = coverageZones.some((z) => z.center_lat != null);
    if (!hasGeo) {
      setOutsideZone(false);
      return;
    }

    const found = findZoneForLocation(lat, lng, coverageZones);
    if (found) {
      setFormCity(found.zone_name);
      setOutsideZone(false);
    } else {
      setOutsideZone(true);
      setFormCity("");
    }
  }, [coverageZones]);

  const handlePhoneSourceChange = (val: string) => {
    setPhoneSource(val);
    if (val === "primary" && profile?.phone) setFormPhone(profile.phone);
    else if (val === "secondary" && (profile as any)?.phone_secondary) setFormPhone((profile as any).phone_secondary);
    else if (val === "custom") setFormPhone("");
  };

  const resetForm = () => {
    setFormCustomerName(""); setFormName(""); setFormCity(""); setFormDistrict("");
    setFormStreet(""); setFormBuilding(""); setFormLandmark(""); setFormDefault(false);
    setFormPhone(""); setPhoneSource("primary");
    setFormLat(undefined); setFormLng(undefined);
    setEditingId(null); setOutsideZone(false); setCoverageChecked(false);
    setStep(1);
  };

  const openEdit = (addr: any) => {
    setEditingId(addr.id);
    setFormCustomerName(addr.customer_name || "");
    setFormName(addr.address_name || "");
    setFormCity(addr.city || "");
    setFormDistrict(addr.district || "");
    setFormStreet(addr.street || "");
    setFormBuilding(addr.building_number || "");
    setFormLandmark(addr.landmark || "");
    setFormDefault(!!addr.is_default);
    setFormPhone(addr.phone || "");
    setPhoneSource(addr.phone ? "custom" : "primary");
    setFormLat(addr.latitude ?? undefined);
    setFormLng(addr.longitude ?? undefined);
    setOutsideZone(false); setCoverageChecked(true);
    setStep(2); // skip map step when editing
    setShowForm(true);
  };

  const buildFullAddress = () =>
    [formCity, formDistrict, formStreet, formBuilding && `مبنى ${formBuilding}`]
      .filter(Boolean).join("، ");

  const handleGoToStep2 = () => {
    if (!formLat || !formLng) {
      toast({ title: "يرجى تحديد موقعك على الخريطة أولاً", variant: "destructive" });
      return;
    }
    if (outsideZone) {
      toast({ title: "موقعك خارج نطاق التغطية حالياً", description: "يمكنك الدخول كزائر فقط", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleAdd = async () => {
    if (!user || !formCustomerName.trim() || !formName.trim()) {
      toast({ title: "يرجى ملء اسم العميل واسم العنوان على الأقل", variant: "destructive" });
      return;
    }
    if (formPhone) {
      const phoneErr = getPhoneError(formPhone);
      if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, user.id, {
          customer_name:   formCustomerName,
          address_name:    formName,
          full_address:    buildFullAddress(),
          city:            formCity,
          district:        formDistrict || null,
          street:          formStreet || null,
          building_number: formBuilding || null,
          landmark:        formLandmark || null,
          is_default:      formDefault,
          phone:           formPhone || null,
          latitude:        formLat ?? null,
          longitude:       formLng ?? null,
        });
        toast({ title: "✅ تم تحديث العنوان بنجاح" });
      } else {
        await createAddress({
          customer_id:     user.id,
          customer_name:   formCustomerName,
          address_name:    formName,
          full_address:    buildFullAddress(),
          city:            formCity,
          district:        formDistrict || undefined,
          street:          formStreet || undefined,
          building_number: formBuilding || undefined,
          landmark:        formLandmark || undefined,
          is_default:      formDefault,
          phone:           formPhone || undefined,
          latitude:        formLat,
          longitude:       formLng,
        });
        toast({ title: "✅ تم إضافة العنوان بنجاح" });
      }
      setShowForm(false);
      resetForm();
      if (formCity) localStorage.setItem(SELECTED_CITY_KEY, formCity);
      if (formDefault) {
        queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      }
      if (isWelcome) {
        toast({ title: "مرحباً بك في وصل! 🎉", description: "يمكنك الآن البدء بالطلب" });
        navigate("/");
        return;
      }
      if (returnTo) {
        navigate(returnTo);
        return;
      }
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddress(id);
      toast({ title: "🗑️ تم حذف العنوان" });
      setDeleteConfirm(null);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {!isWelcome && !returnTo && <BackButton />}

        {isWelcome && (
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">👋</span>
              <div>
                <h2 className="text-xl font-black">مرحباً بك في وصل!</h2>
                <p className="text-white/85 text-sm">لبدء الاستخدام، أضف عنوانك الأول حتى نتمكن من التوصيل إليك</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> {isWelcome ? "أضف عنوانك" : "عناويني"}
          </h1>
          {!isWelcome && !returnTo && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> إضافة عنوان
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : addresses.length === 0 && !isWelcome && !returnTo ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              لا توجد عناوين محفوظة
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <Card key={addr.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        {addr.address_name}
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-0.5 text-xs bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-secondary" /> افتراضي
                          </span>
                        )}
                      </p>
                      {addr.customer_name && (
                        <p className="text-xs text-primary font-medium mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" /> {addr.customer_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">{addr.full_address}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {addr.city && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Building2 className="w-3 h-3" />{addr.city}
                          </span>
                        )}
                        {addr.district && <span className="text-xs text-muted-foreground">{addr.district}</span>}
                      </div>
                      {addr.phone && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> +967{addr.phone}
                        </p>
                      )}
                      {addr.landmark && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> {addr.landmark}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(addr)} className="text-primary hover:text-primary hover:bg-primary/10">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(addr.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add / Edit Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={isWelcome ? undefined : (v) => { setShowForm(v); if (!v) resetForm(); }}
        >
          <DialogContent
            dir="rtl"
            className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
            onInteractOutside={isWelcome ? (e) => e.preventDefault() : undefined}
            onEscapeKeyDown={isWelcome ? (e) => e.preventDefault() : undefined}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingId ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                {isWelcome ? "أضف عنوانك الأول للمتابعة" : editingId ? "تعديل العنوان" : "إضافة عنوان جديد"}
              </DialogTitle>
              {/* Step indicator */}
              {!editingId && (
                <div className="flex items-center gap-2 pt-1">
                  <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
                  <span className="text-xs text-muted-foreground">الخطوة {step} من 2</span>
                </div>
              )}
            </DialogHeader>

            {/* ── STEP 1: Location / Map ───────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm text-primary flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>حدد موقعك على الخريطة بالضغط عليها أو اسحب الدبوس — سيتم تحديد مدينتك تلقائياً</span>
                </div>

                <MapPicker
                  lat={formLat}
                  lng={formLng}
                  onLocationSelect={handleLocationSelect}
                  height="280px"
                  autoGps={true}
                />

                {/* Coverage feedback */}
                {coverageChecked && !outsideZone && formCity && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3">
                    <span className="text-base">✅</span>
                    <span>موقعك مدعوم! تم تحديد المدينة تلقائياً: <strong>{formCity}</strong></span>
                  </div>
                )}

                {coverageChecked && outsideZone && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3">
                    <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">مدينتك خارج النطاق</p>
                      <p className="text-xs mt-0.5">خدمات وصل لم تصل بعد إلى منطقتك. قريباً في مدينتك!</p>
                      <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={() => navigate("/")}>
                        الدخول كزائر
                      </Button>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2 pt-2">
                  {!isWelcome && !returnTo && (
                    <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>إلغاء</Button>
                  )}
                  <Button
                    onClick={handleGoToStep2}
                    disabled={!formLat || !formLng || outsideZone}
                    className="gap-1 flex-1"
                  >
                    التالي — ملء التفاصيل
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* ── STEP 2: Details ─────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                {/* City — read-only, auto-filled */}
                {formCity && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <span className="text-muted-foreground text-xs">المدينة (محددة تلقائياً)</span>
                      <p className="font-semibold text-foreground">{formCity}</p>
                    </div>
                  </div>
                )}

                {/* Customer Name — required */}
                <div>
                  <Label className="flex items-center gap-1">
                    <User className="w-3 h-3 text-primary" />
                    اسم العميل الكامل <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="الاسم الكامل للاستلام"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">اسمك الحقيقي لضمان التسليم الصحيح</p>
                </div>

                {/* Address Name */}
                <div>
                  <Label>اسم العنوان <span className="text-destructive">*</span></Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="المنزل، العمل، بيت العائلة..."
                    className="mt-1"
                  />
                </div>

                {/* District */}
                <div>
                  <Label>الحي / المنطقة</Label>
                  <Input value={formDistrict} onChange={(e) => setFormDistrict(e.target.value)} placeholder="اسم الحي أو المنطقة" className="mt-1" />
                </div>

                {/* Street */}
                <div>
                  <Label>الشارع</Label>
                  <Input value={formStreet} onChange={(e) => setFormStreet(e.target.value)} placeholder="اسم أو رقم الشارع" className="mt-1" />
                </div>

                {/* Building */}
                <div>
                  <Label className="flex items-center gap-1"><Building2 className="w-3 h-3 text-primary" /> رقم المبنى</Label>
                  <Input value={formBuilding} onChange={(e) => setFormBuilding(e.target.value)} placeholder="رقم المبنى أو الشقة" className="mt-1" />
                </div>

                {/* Landmark */}
                <div>
                  <Label className="flex items-center gap-1"><Navigation className="w-3 h-3 text-primary" /> أقرب معلم</Label>
                  <Input value={formLandmark} onChange={(e) => setFormLandmark(e.target.value)} placeholder="بجوار مسجد..., مقابل..." className="mt-1" />
                </div>

                {/* Phone */}
                <div>
                  <Label className="flex items-center gap-1"><Phone className="w-3 h-3 text-primary" /> رقم الهاتف للعنوان</Label>
                  <Select value={phoneSource} onValueChange={handlePhoneSourceChange}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {profile?.phone && <SelectItem value="primary">الرقم الأساسي: +967{profile.phone}</SelectItem>}
                      {(profile as any)?.phone_secondary && <SelectItem value="secondary">الرقم الثانوي: +967{(profile as any).phone_secondary}</SelectItem>}
                      <SelectItem value="custom">إدخال رقم آخر</SelectItem>
                    </SelectContent>
                  </Select>
                  {phoneSource === "custom" && (
                    <div className="flex gap-2 mt-2">
                      <div className="flex items-center justify-center bg-muted rounded-md px-3 h-10 text-sm font-medium text-muted-foreground border border-input shrink-0" dir="ltr">+967</div>
                      <Input
                        value={formPhone}
                        onChange={(e) => setFormPhone(formatYemeniPhone(e.target.value))}
                        placeholder="7XX XXX XXX"
                        dir="ltr"
                        maxLength={9}
                      />
                    </div>
                  )}
                  {formPhone && getPhoneError(formPhone) && (
                    <p className="text-xs text-destructive mt-1">{getPhoneError(formPhone)}</p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formDefault}
                    onChange={(e) => setFormDefault(e.target.checked)}
                    className="accent-primary w-4 h-4"
                  />
                  <Star className="w-4 h-4 text-secondary" /> تعيين كعنوان افتراضي
                </label>

                <DialogFooter className="gap-2 pt-2">
                  {!editingId && (
                    <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                      <ArrowRight className="w-4 h-4" />
                      رجوع
                    </Button>
                  )}
                  {!isWelcome && !returnTo && editingId && (
                    <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>إلغاء</Button>
                  )}
                  <Button
                    onClick={handleAdd}
                    disabled={saving}
                    className={`gap-1 ${isWelcome || returnTo ? "flex-1" : ""}`}
                  >
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                      : <><MapPin className="w-4 h-4" /> {isWelcome || returnTo ? "حفظ والمتابعة →" : editingId ? "تحديث العنوان" : "حفظ العنوان"}</>
                    }
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> تأكيد الحذف
              </DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">هل أنت متأكد من حذف هذا العنوان؟</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
              <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="gap-1">
                <Trash2 className="w-4 h-4" /> حذف
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AddressesPage;
