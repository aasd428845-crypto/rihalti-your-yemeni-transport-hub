import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bus } from "lucide-react";
import { searchTrips, fetchRegions } from "@/lib/customerApi";
import TripCard from "@/components/trips/TripCard";
import TripFilters from "@/components/trips/TripFilters";

import BackButton from "@/components/common/BackButton";
import type { TripSearchParams } from "@/types/customer.types";

const TripsPage = () => {
  const [urlParams] = useSearchParams();
  const [searchParams, setSearchParams] = useState<TripSearchParams>(() => ({
    from_city: urlParams.get("from") || urlParams.get("q") || undefined,
    to_city: urlParams.get("to") || undefined,
    date: urlParams.get("date") || undefined,
  }));

  useEffect(() => {
    const q = urlParams.get("q");
    const from = urlParams.get("from");
    const to = urlParams.get("to");
    if (q || from || to) {
      setSearchParams((prev) => ({
        ...prev,
        from_city: from || q || prev.from_city,
        to_city: to || prev.to_city,
      }));
    }
  }, [urlParams]);

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips-search", searchParams],
    queryFn: () => searchTrips(searchParams),
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">البحث عن رحلة</h1>
          <p className="text-muted-foreground">ابحث عن الرحلات المتاحة واحجز مقعدك الآن</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-72 shrink-0">
            <TripFilters
              regions={regions || []}
              onFilter={setSearchParams}
              initialParams={searchParams}
            />
          </aside>

          <main className="flex-1">
            {trips && (
              <p className="text-sm text-muted-foreground mb-4">
                {trips.length > 0 ? `تم العثور على ${trips.length} رحلة` : ""}
              </p>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
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
            ) : trips && trips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Bus className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد رحلات متاحة</h3>
                <p className="text-muted-foreground">جرب البحث بمعايير مختلفة أو في تاريخ آخر</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default TripsPage;
