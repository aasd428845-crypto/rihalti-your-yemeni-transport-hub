import { supabase } from "@/integrations/supabase/client";

export interface CoverageZone {
  id: string;
  zone_name: string;
  delivery_fee: number;
  estimated_time: string | null;
  is_active: boolean;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchActiveCoverageZones(): Promise<CoverageZone[]> {
  const { data } = await supabase
    .from("delivery_zones" as any)
    .select("id, zone_name, delivery_fee, estimated_time, is_active, center_lat, center_lng, radius_km")
    .eq("is_active", true)
    .order("zone_name");
  return (data || []) as CoverageZone[];
}

export function findZoneForLocation(
  lat: number,
  lng: number,
  zones: CoverageZone[]
): CoverageZone | null {
  const withGeo = zones.filter((z) => z.center_lat != null && z.center_lng != null);
  if (!withGeo.length) return null;

  let best: CoverageZone | null = null;
  let bestDist = Infinity;

  for (const zone of withGeo) {
    const dist = haversineKm(lat, lng, zone.center_lat!, zone.center_lng!);
    const radius = zone.radius_km ?? 5;
    if (dist <= radius && dist < bestDist) {
      best = zone;
      bestDist = dist;
    }
  }
  return best;
}

export function isCoveredByZones(lat: number, lng: number, zones: CoverageZone[]): boolean {
  return findZoneForLocation(lat, lng, zones) !== null;
}

export const COVERAGE_STATUS_KEY = "wasal_coverage_status";
export const SELECTED_CITY_KEY   = "wasal_selected_city";
export type CoverageStatus = "covered" | "uncovered" | "guest" | null;
