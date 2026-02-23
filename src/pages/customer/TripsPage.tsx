import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Calendar, Users, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { searchTrips, fetchRegions } from "@/lib/customerApi";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const TripsPage = () => {
  const navigate = useNavigate();
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [date, setDate] = useState("");
  const [searchParams, setSearchParams] = useState<{ from_city?: string; to_city?: string; date?: string }>({});

  const { data: regions } = useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });

  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips-search", searchParams],
    queryFn: () => searchTrips(searchParams),
  });

  const handleSearch = () => {
    setSearchParams({
      from_city: fromCity || undefined,
      to_city: toCity || undefined,
      date: date || undefined,
    });
  };

  const cities = regions?.filter((r) => r.type === "city" || r.type === "governorate") || [];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">البحث عن رحلة</h1>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="من أين؟"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="pr-10"
                  list="cities-from"
                />
                <datalist id="cities-from">
                  {cities.map((c) => (
                    <option key={c.id} value={c.name_ar} />
                  ))}
                </datalist>
              </div>
              <div className="relative">
                <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="إلى أين؟"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="pr-10"
                  list="cities-to"
                />
                <datalist id="cities-to">
                  {cities.map((c) => (
                    <option key={c.id} value={c.name_ar} />
                  ))}
                </datalist>
              </div>
              <div className="relative">
                <Calendar className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pr-10" />
              </div>
              <Button onClick={handleSearch} className="bg-primary text-primary-foreground gap-2">
                <Search className="w-4 h-4" />
                بحث
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trips && trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/trips/${trip.id}`)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-primary">
                      <MapPin className="w-4 h-4" />
                      <span className="font-semibold">{trip.from_city}</span>
                    </div>
                    <span className="text-muted-foreground">←</span>
                    <div className="flex items-center gap-2 text-primary">
                      <MapPin className="w-4 h-4" />
                      <span className="font-semibold">{trip.to_city}</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{format(new Date(trip.departure_time), "dd MMMM yyyy - HH:mm", { locale: ar })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{trip.available_seats} مقاعد متاحة</span>
                    </div>
                    {trip.bus_company && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        <span>{trip.bus_company}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{trip.price} ر.ي</span>
                    {trip.is_offer && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        عرض خاص
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد رحلات متاحة</h3>
            <p className="text-muted-foreground">جرب البحث بمعايير مختلفة</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripsPage;
