import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { LocateFixed } from "lucide-react";

// Fix default marker icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

const MapPicker = ({ lat, lng, onLocationSelect, height = "250px" }: MapPickerProps) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const defaultCenter: [number, number] = [15.3694, 44.191]; // Sana'a
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      center: lat && lng ? [lat, lng] : defaultCenter,
      zoom: lat && lng ? 15 : 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: nextLat, lng: nextLng } = e.latlng;
      onLocationSelect(nextLat, nextLng);

      if (!markerRef.current) {
        markerRef.current = L.marker([nextLat, nextLng]).addTo(map);
      } else {
        markerRef.current.setLatLng([nextLat, nextLng]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [defaultCenter, lat, lng, onLocationSelect]);

  useEffect(() => {
    if (!mapRef.current || lat === undefined || lng === undefined) return;

    const map = mapRef.current;
    map.setView([lat, lng], 15);

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;
        onLocationSelect(nextLat, nextLng);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">انقر على الخريطة لتحديد الموقع</p>
        <Button type="button" variant="outline" size="sm" onClick={handleLocateMe} disabled={locating} className="gap-1">
          <LocateFixed className={`w-3 h-3 ${locating ? "animate-spin" : ""}`} />
          موقعي
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
        <div ref={mapElRef} className="h-full w-full" />
      </div>

      {lat !== undefined && lng !== undefined && (
        <p className="text-xs text-primary">📍 {lat.toFixed(5)}, {lng.toFixed(5)}</p>
      )}
    </div>
  );
};

export default MapPicker;
