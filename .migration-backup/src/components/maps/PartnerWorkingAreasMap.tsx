import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Known coordinates for Yemeni regions
const REGION_COORDS: Record<string, [number, number]> = {
  "صنعاء": [15.3694, 44.1910],
  "عدن": [12.7855, 45.0187],
  "تعز": [13.5789, 44.0219],
  "الحديدة": [14.7979, 42.9540],
  "إب": [13.9667, 44.1667],
  "ذمار": [14.5364, 44.4053],
  "المكلا": [14.5424, 49.1244],
  "حضرموت": [15.3547, 48.7884],
  "مأرب": [15.4543, 45.3269],
  "البيضاء": [14.1682, 45.5729],
  "لحج": [13.0567, 44.8833],
  "أبين": [13.3572, 45.8647],
  "شبوة": [14.5319, 47.0156],
  "المهرة": [16.5210, 52.2355],
  "الجوف": [16.2004, 45.4740],
  "صعدة": [16.9430, 43.7637],
  "عمران": [15.6594, 43.9439],
  "حجة": [15.6916, 43.6034],
  "الضالع": [13.6948, 44.7308],
  "ريمة": [14.6298, 43.7252],
  "سقطرى": [12.4634, 53.9239],
  "سيئون": [15.9428, 48.7880],
  "المحويت": [15.4709, 43.5445],
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  areas: string[];
}

const PartnerWorkingAreasMap = ({ areas }: Props) => {
  const [markers, setMarkers] = useState<{ name: string; lat: number; lng: number }[]>([]);

  useEffect(() => {
    const found = areas
      .map((area) => {
        // Try exact match or partial match
        const key = Object.keys(REGION_COORDS).find(
          (k) => area.includes(k) || k.includes(area)
        );
        if (key) {
          const [lat, lng] = REGION_COORDS[key];
          return { name: area, lat, lng };
        }
        return null;
      })
      .filter(Boolean) as { name: string; lat: number; lng: number }[];
    setMarkers(found);
  }, [areas]);

  if (markers.length === 0) return null;

  const center: [number, number] = [
    markers.reduce((s, m) => s + m.lat, 0) / markers.length,
    markers.reduce((s, m) => s + m.lng, 0) / markers.length,
  ];

  return (
    <div className="rounded-lg overflow-hidden border border-border h-[250px]">
      <MapContainer center={center} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m) => (
          <Marker key={m.name} position={[m.lat, m.lng]} icon={markerIcon}>
            <Popup>
              <span className="font-semibold">{m.name}</span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default PartnerWorkingAreasMap;
