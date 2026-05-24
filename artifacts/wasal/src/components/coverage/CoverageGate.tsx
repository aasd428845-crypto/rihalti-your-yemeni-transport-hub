import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Wifi, WifiOff } from "lucide-react";
import MapPicker from "@/components/maps/MapPicker";
import {
  fetchActiveCoverageZones,
  findZoneForLocation,
  COVERAGE_STATUS_KEY,
  SELECTED_CITY_KEY,
  type CoverageStatus,
  type CoverageZone,
} from "@/lib/coverageApi";
import { useAuth } from "@/contexts/AuthContext";

interface Props { children: React.ReactNode; }

const BYPASS_ROLES = ["admin", "delivery_company", "driver", "delivery_driver", "supplier"];

const CoverageGate = ({ children }: Props) => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [status, setStatus]             = useState<CoverageStatus>(null);
  const [gateLoading, setGateLoading]   = useState(true);
  const [zones, setZones]               = useState<CoverageZone[]>([]);

  // Map-picker state (used when status === null)
  const [pickedLat, setPickedLat]       = useState<number | undefined>();
  const [pickedLng, setPickedLng]       = useState<number | undefined>();
  const [pickedZone, setPickedZone]     = useState<CoverageZone | null>(null);
  const [pickedOutside, setPickedOutside] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);

  const isStaff = profile && BYPASS_ROLES.includes((profile as any).role ?? "");

  useEffect(() => {
    const stored = localStorage.getItem(COVERAGE_STATUS_KEY) as CoverageStatus;
    setStatus(stored);
  }, []);

  const loadZones = useCallback(async () => {
    const z = await fetchActiveCoverageZones();
    setZones(z);
    return z;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (isStaff) { setGateLoading(false); return; }
    if (status !== null) { setGateLoading(false); return; }

    loadZones().then((activeZones) => {
      if (!activeZones.length) {
        setStatus("covered");
        localStorage.setItem(COVERAGE_STATUS_KEY, "covered");
        setGateLoading(false);
        return;
      }
      const hasGeo = activeZones.some((z) => z.center_lat != null);
      if (!hasGeo) {
        setStatus("covered");
        localStorage.setItem(COVERAGE_STATUS_KEY, "covered");
        setGateLoading(false);
        return;
      }
      setGateLoading(false);
    });
  }, [authLoading, isStaff, status, loadZones]);

  const handleMapPick = useCallback((lat: number, lng: number) => {
    setPickedLat(lat);
    setPickedLng(lng);
    setLocationChecked(true);
    const hasGeo = zones.some((z) => z.center_lat != null);
    if (!hasGeo) { setPickedZone(null); setPickedOutside(false); return; }
    const found = findZoneForLocation(lat, lng, zones);
    if (found) { setPickedZone(found); setPickedOutside(false); }
    else       { setPickedZone(null); setPickedOutside(true); }
  }, [zones]);

  const confirmLocation = () => {
    if (!pickedZone) return;
    localStorage.setItem(COVERAGE_STATUS_KEY, "covered");
    localStorage.setItem(SELECTED_CITY_KEY, pickedZone.zone_name);
    setStatus("covered");
    // المستخدم المسجل → وجّهه لإضافة عنوانه (الخطوة 2)
    if (user) navigate("/addresses?welcome=1");
  };

  const enterAsGuest = () => {
    localStorage.setItem(COVERAGE_STATUS_KEY, "guest");
    setStatus("guest");
  };

  const resetAndRetry = () => {
    localStorage.removeItem(COVERAGE_STATUS_KEY);
    localStorage.removeItem(SELECTED_CITY_KEY);
    setStatus(null);
    setPickedLat(undefined); setPickedLng(undefined);
    setPickedZone(null); setPickedOutside(false); setLocationChecked(false);
  };

  if (authLoading || gateLoading) return <>{children}</>;
  if (isStaff)                    return <>{children}</>;
  if (status === "covered" || status === "guest") return <>{children}</>;

  // ── status === null → شاشة تحديد الموقع بالخريطة (خطوة 1 من 2) ──────────
  if (status === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        {/* Header */}
        <div className="bg-primary px-6 pt-10 pb-6 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black">مرحباً في وصل</h1>
          <p className="text-white/85 text-sm mt-1.5 leading-relaxed">
            حدد موقعك لنتأكد من تغطيتنا في منطقتك
          </p>
        </div>

        {/* Step bar */}
        <div className="flex items-center gap-2 px-5 py-3 bg-muted/40 border-b border-border/30">
          <div className="h-1.5 flex-1 rounded-full bg-primary" />
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
          <span className="text-xs text-muted-foreground shrink-0">الخطوة 1 من 2</span>
        </div>

        <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto pb-8">
          <p className="text-sm text-muted-foreground text-center">
            اضغط على الخريطة أو اسحب الدبوس لتحديد موقعك — سيتم تحديد مدينتك تلقائياً
          </p>

          <MapPicker
            lat={pickedLat}
            lng={pickedLng}
            onLocationSelect={handleMapPick}
            height="300px"
            autoGps={true}
          />

          {/* نتيجة الفحص */}
          {locationChecked && !pickedOutside && pickedZone && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
              <span className="text-base shrink-0">✅</span>
              <div>
                <p className="font-semibold">رائع! موقعك مدعوم</p>
                <p className="text-xs opacity-80">تم تحديد المدينة: <strong>{pickedZone.zone_name}</strong></p>
              </div>
            </div>
          )}

          {locationChecked && pickedOutside && (
            <div className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
              <p className="font-semibold">مدينتك خارج نطاق التوصيل حالياً</p>
              <p className="text-xs mt-0.5 opacity-80">قريباً في مدينتك — نعمل على التوسع!</p>
            </div>
          )}

          <div className="space-y-2 pt-1">
            {locationChecked && !pickedOutside && pickedZone && (
              <Button className="w-full h-12 gap-2 text-base font-bold" onClick={confirmLocation}>
                متابعة — إضافة تفاصيل العنوان
                <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            )}

            {locationChecked && pickedOutside && (
              <Button className="w-full h-12" variant="outline" onClick={enterAsGuest}>
                الدخول كزائر واستعراض الخدمات
              </Button>
            )}

            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={enterAsGuest}>
              تخطي — الدخول كزائر
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── status === "uncovered" → شاشة "خارج التغطية" ─────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 rounded-full bg-amber-100 dark:bg-amber-900/30 animate-ping opacity-40" />
          <div className="relative w-24 h-24 rounded-full bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-amber-500" />
          </div>
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium px-3 py-1 rounded-full mb-3">
            <Wifi className="w-3 h-3" /> قريباً في منطقتك
          </div>
          <h2 className="text-2xl font-black text-foreground">نحن في طريقنا إليك!</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            خدمات وصل لم تصل بعد إلى منطقتك،<br />لكننا نعمل على التوسع قريباً.
          </p>
        </div>
        <div className="space-y-3">
          <Button className="w-full gap-2 h-12" variant="outline" onClick={enterAsGuest}>
            الدخول كزائر واستعراض الخدمات
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground w-full" onClick={resetAndRetry}>
            تحديد موقع مختلف
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoverageGate;
