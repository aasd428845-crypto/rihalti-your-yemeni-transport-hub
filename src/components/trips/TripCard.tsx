import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Users, Bus, Tag, Image } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface TripCardProps {
  trip: any;
}

const TripCard = ({ trip }: TripCardProps) => {
  const navigate = useNavigate();

  const finalPrice = trip.is_offer && trip.offer_value
    ? trip.offer_type === "percentage"
      ? trip.price * (1 - trip.offer_value / 100)
      : trip.price - trip.offer_value
    : trip.price;

  const supplierName = trip.supplier?.full_name || "مورد";
  const supplierLogo = trip.supplier?.logo_url;

  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden border-border/50"
      onClick={() => navigate(`/trips/${trip.id}`)}
    >
      {/* Trip Image */}
      <div className="relative h-44 bg-muted overflow-hidden">
        {trip.image_url ? (
          <img src={trip.image_url} alt={`${trip.from_city} → ${trip.to_city}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-hero-gradient flex items-center justify-center">
            <Bus className="w-12 h-12 text-primary-foreground/50" />
          </div>
        )}
        {trip.is_offer && (
          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground gap-1">
            <Tag className="w-3 h-3" />
            عرض خاص
          </Badge>
        )}
        {/* Supplier Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
          {supplierLogo ? (
            <img src={supplierLogo} alt={supplierName} className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Bus className="w-3 h-3 text-primary" />
            </div>
          )}
          <span className="text-xs font-medium text-foreground">{supplierName}</span>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Route */}
        <div className="flex items-center gap-2 text-lg font-bold text-foreground">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span>{trip.from_city}</span>
          <span className="text-muted-foreground mx-1">←</span>
          <MapPin className="w-4 h-4 text-destructive shrink-0" />
          <span>{trip.to_city}</span>
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {format(new Date(trip.departure_time), "EEEE dd MMM • HH:mm", { locale: ar })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {trip.available_seats} مقعد
          </span>
        </div>

        {/* Amenities */}
        {trip.amenities && Array.isArray(trip.amenities) && trip.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(trip.amenities as string[]).slice(0, 4).map((a) => (
              <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0">
                {a === "ac" ? "تكييف" : a === "wifi" ? "واي فاي" : a === "usb" ? "USB" : a === "water" ? "مياه" : a}
              </Badge>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{Math.round(finalPrice).toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">ر.ي</span>
            {trip.is_offer && trip.offer_value && (
              <span className="text-sm line-through text-muted-foreground">{trip.price.toLocaleString()}</span>
            )}
          </div>
          <Button size="sm" variant="default" className="gap-1">
            التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripCard;
