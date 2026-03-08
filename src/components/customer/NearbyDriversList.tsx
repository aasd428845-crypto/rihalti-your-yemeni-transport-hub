import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Car, MapPin, User, Navigation } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NearbyDriversListProps {
  pickupLat: number;
  pickupLng: number;
  onSelectDriver?: (driverId: string) => void;
}

interface DriverCard {
  driverId: string;
  userId: string;
  fullName: string;
  age: number | null;
  rating: number;
  totalTrips: number;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleType: string;
  vehicleColor: string;
  plateNumber: string;
  vehicleImageUrl: string | null;
  distanceKm: number;
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateAge = (dob: string | null): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const vehicleTypeLabels: Record<string, string> = {
  car: "سيارة",
  motorcycle: "دراجة نارية",
  tuktuk: "توك توك",
};

const NearbyDriversList = ({ pickupLat, pickupLng, onSelectDriver }: NearbyDriversListProps) => {
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);

      // Get online driver locations
      const { data: locations } = await supabase
        .from("driver_locations")
        .select("*")
        .eq("is_online", true);

      if (!locations || locations.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const driverIds = locations.map((l) => l.driver_id);

      // Get approved drivers
      const { data: driversData } = await supabase
        .from("drivers")
        .select("*")
        .in("id", driverIds)
        .eq("is_approved", true);

      if (!driversData || driversData.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      // Get profiles
      const userIds = driversData.map((d) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      // Get default vehicles
      const approvedDriverIds = driversData.map((d) => d.id);
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("*")
        .in("driver_id", approvedDriverIds)
        .eq("is_active", true)
        .order("is_default", { ascending: false });

      // Build cards
      const cards: DriverCard[] = driversData.map((driver) => {
        const location = locations.find((l) => l.driver_id === driver.id);
        const profile = profiles?.find((p) => p.user_id === driver.user_id);
        const vehicle = vehicles?.find((v) => v.driver_id === driver.id);

        const dist = location
          ? calculateDistance(pickupLat, pickupLng, location.lat, location.lng)
          : 999;

        return {
          driverId: driver.id,
          userId: driver.user_id,
          fullName: profile?.full_name || "سائق",
          age: calculateAge((driver as any).date_of_birth),
          rating: driver.rating || 0,
          totalTrips: driver.total_trips || 0,
          vehicleBrand: vehicle?.brand || "—",
          vehicleModel: vehicle?.model || "",
          vehicleType: vehicle?.vehicle_type || "car",
          vehicleColor: vehicle?.color || "",
          plateNumber: vehicle?.plate_number || "—",
          vehicleImageUrl: (vehicle as any)?.image_url || null,
          distanceKm: Math.round(dist * 10) / 10,
        };
      });

      // Sort by distance
      cards.sort((a, b) => a.distanceKm - b.distanceKm);
      setDrivers(cards);
      setLoading(false);
    };

    if (pickupLat && pickupLng) {
      fetchDrivers();
    }
  }, [pickupLat, pickupLng]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          جاري البحث عن سائقين قريبين...
        </h3>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="text-center py-8">
          <Car className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">لا يوجد سائقون متصلون حالياً</p>
          <p className="text-xs text-muted-foreground mt-1">
            يمكنك إرسال الطلب وسيتم إشعار السائقين عند اتصالهم
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Navigation className="w-4 h-4 text-primary" />
        السائقون القريبون ({drivers.length})
      </h3>

      {drivers.map((driver) => (
        <Card key={driver.driverId} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Vehicle Image or Avatar */}
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {driver.vehicleImageUrl ? (
                  <img
                    src={driver.vehicleImageUrl}
                    alt="سيارة"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Car className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{driver.fullName}</span>
                  {driver.age && (
                    <span className="text-xs text-muted-foreground">({driver.age} سنة)</span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    {Number(driver.rating).toFixed(1)}
                  </span>
                  <span>{driver.totalTrips} رحلة</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {driver.distanceKm} كم
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {vehicleTypeLabels[driver.vehicleType] || driver.vehicleType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {driver.vehicleBrand} {driver.vehicleModel}
                    {driver.vehicleColor && ` · ${driver.vehicleColor}`}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{driver.plateNumber}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NearbyDriversList;
