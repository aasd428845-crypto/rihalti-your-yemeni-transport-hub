import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { LocateFixed, Loader2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;

const CUSTOM_ICON = L.divIcon({
  html: `<div style="
    width:36px;height:36px;
    background:#1a5c3a;
    border:3px solid #fff;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  className: "",
});

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
  autoGps?: boolean;
}

const MapPicker = ({ lat, lng, onLocationSelect, height = "260px", autoGps = false }: MapPickerProps) => {
  const mapElRef  = useRef<HTMLDivElement | null>(null);
  const mapRef    = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const defaultCenter: [number, number] = [15.3694, 44.191];
  const [locating, setLocating] = useState(false);

  const placeMarker = (map: L.Map, latVal: number, lngVal: number) => {
    if (!markerRef.current) {
      markerRef.current = L.marker([latVal, lngVal], { icon: CUSTOM_ICON, draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        onLocationSelect(pos.lat, pos.lng);
      });
    } else {
      markerRef.current.setLatLng([latVal, lngVal]);
    }
  };

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    const map = L.map(mapElRef.current, {
      center: lat && lng ? [lat, lng] : defaultCenter,
      zoom: lat && lng ? 15 : 12,
      zoomControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: nextLat, lng: nextLng } = e.latlng;
      placeMarker(map, nextLat, nextLng);
      onLocationSelect(nextLat, nextLng);
    });

    if (lat !== undefined && lng !== undefined) {
      placeMarker(map, lat, lng);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || lat === undefined || lng === undefined) return;
    mapRef.current.setView([lat, lng], 15, { animate: true });
    placeMarker(mapRef.current, lat, lng);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (autoGps && !lat && !lng) {
      handleLocateMe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGps]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">اضغط على الخريطة أو اسحب الدبوس لتحديد موقعك</p>
        <Button type="button" variant="outline" size="sm" onClick={handleLocateMe} disabled={locating} className="gap-1 h-8 text-xs">
          {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
          {locating ? "جاري التحديد..." : "موقعي الحالي"}
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm" style={{ height }}>
        <div ref={mapElRef} className="h-full w-full" />
      </div>

      {lat !== undefined && lng !== undefined && (
        <p className="text-xs text-primary flex items-center gap-1">
          <span className="w-2 h-2 bg-primary rounded-full inline-block" />
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
};

export default MapPicker;
