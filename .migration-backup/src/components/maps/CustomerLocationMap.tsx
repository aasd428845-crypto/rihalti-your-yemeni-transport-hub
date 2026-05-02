import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface CustomerLocationMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  landmark?: string;
  label?: string;
}

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CustomerLocationMap = ({ lat, lng, address, landmark, label = "موقع العميل" }: CustomerLocationMapProps) => {
  const [open, setOpen] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (open && lat && lng && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMyLat(pos.coords.latitude);
          setMyLng(pos.coords.longitude);
          setDistance(haversineDistance(pos.coords.latitude, pos.coords.longitude, lat, lng));
        },
        () => {}
      );
    }
  }, [open, lat, lng]);

  if (!lat || !lng) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-lg">
        <MapPin className="w-4 h-4" />
        <span>لا تتوفر إحداثيات الموقع</span>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <MapPin className="w-4 h-4" /> عرض {label} على الخريطة
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> {label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-border" style={{ height: "300px" }}>
              {open && (
                <MapContainer
                  center={[lat, lng]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lng]}>
                    <Popup>{label}<br />{address}</Popup>
                  </Marker>
                  {myLat && myLng && (
                    <Marker
                      position={[myLat, myLng]}
                      icon={L.divIcon({
                        className: "bg-primary rounded-full border-2 border-white shadow-lg",
                        iconSize: [14, 14],
                        iconAnchor: [7, 7],
                      })}
                    >
                      <Popup>موقعي الحالي</Popup>
                    </Marker>
                  )}
                </MapContainer>
              )}
            </div>

            {address && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" /> العنوان
                </p>
                <p className="text-muted-foreground mt-1">{address}</p>
              </div>
            )}

            {landmark && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-foreground">📍 أقرب معلم</p>
                <p className="text-muted-foreground mt-1">{landmark}</p>
              </div>
            )}

            {distance !== null && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="text-foreground">
                  المسافة من موقعك: <strong className="text-primary">{distance < 1 ? `${Math.round(distance * 1000)} متر` : `${distance.toFixed(1)} كم`}</strong>
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
                  فتح في خرائط جوجل
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="flex-1">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
                  <Navigation className="w-3 h-3 ml-1" /> الاتجاهات
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerLocationMap;
