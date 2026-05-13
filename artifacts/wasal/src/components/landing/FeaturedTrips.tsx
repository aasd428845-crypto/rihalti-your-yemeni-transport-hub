import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchFeaturedTrips } from "@/lib/customerApi";
import TripCard from "@/components/trips/TripCard";

const FeaturedTrips = () => {
  const navigate = useNavigate();
  const { data: trips, isLoading } = useQuery({
    queryKey: ["featured-trips"],
    queryFn: fetchFeaturedTrips,
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-background" dir="rtl">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">أحدث الرحلات المتاحة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border bg-card animate-pulse">
                <div className="h-44 bg-muted rounded-t-xl" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!trips || trips.length === 0) return null;

  return (
    <section className="py-16 bg-background" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">أحدث الرحلات المتاحة</h2>
            <p className="text-muted-foreground mt-1">احجز مقعدك الآن في أفضل الرحلات</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/trips")} className="gap-2">
            عرض الكل
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.slice(0, 6).map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedTrips;
