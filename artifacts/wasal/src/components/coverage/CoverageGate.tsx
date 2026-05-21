import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Wifi, WifiOff } from "lucide-react";
import {
  fetchActiveCoverageZones,
  findZoneForLocation,
  COVERAGE_STATUS_KEY,
  SELECTED_CITY_KEY,
  type CoverageStatus,
  type CoverageZone,
} from "@/lib/coverageApi";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
}

const BYPASS_ROLES = ["admin", "delivery_company", "driver", "delivery_driver", "supplier"];

const CoverageGate = ({ children }: Props) => {
  const { profile, loading: authLoading } = useAuth();
  const [status, setStatus]           = useState<CoverageStatus>(null);
  const [gateLoading, setGateLoading] = useState(true);
  const [checking, setChecking]       = useState(false);
  const [zones, setZones]             = useState<CoverageZone[]>([]);
  const [detectedZone, setDetectedZone] = useState<CoverageZone | null>(null);

  // Bypass for staff roles
  const isStaff = profile && BYPASS_ROLES.includes((profile as any).role ?? "");

  // On mount – read stored status
  useEffect(() => {
    const stored = localStorage.getItem(COVERAGE_STATUS_KEY) as CoverageStatus;
    setStatus(stored);
  }, []);

  const loadZones = useCallback(async () => {
    const z = await fetchActiveCoverageZones();
    setZones(z);
    return z;
  }, []);

  const checkLocation = useCallback(async () => {
    setChecking(true);
    try {
      const activeZones = zones.length ? zones : await loadZones();

      // If no zones have geo-data yet, let everyone through
      const hasGeo = activeZones.some((z) => z.center_lat != null);
      if (!hasGeo) {
        setStatus("covered");
        localStorage.setItem(COVERAGE_STATUS_KEY, "covered");
        return;
      }

      if (!navigator.geolocation) {
        // Can't detect — let them pick city manually
        setStatus("guest");
        localStorage.setItem(COVERAGE_STATUS_KEY, "guest");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const found = findZoneForLocation(pos.coords.latitude, pos.coords.longitude, activeZones);
          if (found) {
            setDetectedZone(found);
            setStatus("covered");
            localStorage.setItem(COVERAGE_STATUS_KEY, "covered");
            localStorage.setItem(SELECTED_CITY_KEY, found.zone_name);
          } else {
            setStatus("uncovered");
            localStorage.setItem(COVERAGE_STATUS_KEY, "uncovered");
          }
          setChecking(false);
        },
        () => {
          // Permission denied / error — let them through as guest
          setStatus("guest");
          localStorage.setItem(COVERAGE_STATUS_KEY, "guest");
          setChecking(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch {
      setStatus("guest");
      localStorage.setItem(COVERAGE_STATUS_KEY, "guest");
      setChecking(false);
    }
  }, [zones, loadZones]);

  // Auto-trigger check on first visit
  useEffect(() => {
    if (authLoading) return;
    if (isStaff) { setGateLoading(false); return; }
    if (status !== null) { setGateLoading(false); return; }

    loadZones().then((activeZones) => {
      // If no zones at all in DB, don't block
      if (!activeZones.length) {
        setStatus("covered");
        localStorage.setItem(COVERAGE_STATUS_KEY, "covered");
        setGateLoading(false);
        return;
      }
      // If no zones have geo data yet, don't block
      const hasGeo = activeZones.some((z) => z.center_lat != null);
      if (!hasGeo) {
        setStatus("covered");
        localStorage.setItem(COVERAGE_STATUS_KEY, "covered");
        setGateLoading(false);
        return;
      }
      // Zones with geo exist → show location prompt
      setGateLoading(false);
    });
  }, [authLoading, isStaff, status, loadZones]);

  const enterAsGuest = () => {
    setStatus("guest");
    localStorage.setItem(COVERAGE_STATUS_KEY, "guest");
  };

  const resetAndRetry = () => {
    localStorage.removeItem(COVERAGE_STATUS_KEY);
    localStorage.removeItem(SELECTED_CITY_KEY);
    setStatus(null);
    setDetectedZone(null);
  };

  // Pass-through: staff, already covered/guest, auth loading, or no geo data
  if (authLoading || gateLoading) return <>{children}</>;
  if (isStaff) return <>{children}</>;
  if (status === "covered" || status === "guest") return <>{children}</>;

  // ── Status: null (not checked yet) → show location prompt ────────────────
  if (status === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">وصل</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              لنتمكن من تقديم أفضل الخدمات في منطقتك،<br />
              يرجى السماح بتحديد موقعك.
            </p>
          </div>
          <Button
            className="w-full gap-2 h-12 text-base"
            onClick={checkLocation}
            disabled={checking}
          >
            {checking ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> جاري التحقق...</>
            ) : (
              <><MapPin className="w-5 h-5" /> تحديد موقعي</>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={enterAsGuest}>
            تخطي — الدخول كزائر
          </Button>
        </div>
      </div>
    );
  }

  // ── Status: uncovered → show "coming soon" ────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Animated signal icon */}
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
            خدمات وصل لم تصل بعد إلى منطقتك،<br />
            لكننا نعمل على التوسع قريباً.
          </p>
        </div>

        <div className="p-4 bg-muted rounded-2xl text-sm space-y-1">
          <p className="text-muted-foreground">هل تريد إشعارك عند الإطلاق في منطقتك؟</p>
          <p className="font-semibold text-foreground">تابعنا على وسائل التواصل</p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full gap-2 h-12"
            variant="outline"
            onClick={enterAsGuest}
          >
            الدخول كزائر واستعراض الخدمات
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground w-full"
            onClick={resetAndRetry}
          >
            تحديد موقع مختلف
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoverageGate;
