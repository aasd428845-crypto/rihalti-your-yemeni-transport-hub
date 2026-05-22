import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAddresses } from "@/lib/customerApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, Plus } from "lucide-react";

export interface SelectedAddress {
  id: string;
  address_name: string;
  full_address: string;
  customer_name?: string;
  city?: string;
  district?: string;
  street?: string;
  landmark?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface AddressSelectorProps {
  label?: string;
  onSelect: (address: SelectedAddress | null) => void;
  className?: string;
  /** @deprecated — no longer shows location button; kept for backwards compatibility */
  showUseMyLocation?: boolean;
  /** @deprecated — no longer used; kept for backwards compatibility */
  onUseMyLocation?: (lat: number, lng: number) => void;
}

const AddressSelector = ({ label = "اختر عنوان", onSelect, className }: AddressSelectorProps) => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<string>("");

  const load = async () => {
    if (!user) return;
    try {
      const data = await fetchAddresses(user.id);
      setAddresses(data || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Re-load when user navigates back (e.g. after adding address)
  useEffect(() => { load(); }, [location.key]);

  const handleSelect = (value: string) => {
    if (value === "__new") {
      // Navigate to AddressesPage and return here after saving
      navigate(`/addresses?from=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setSelected(value);
    const addr = addresses.find(a => a.id === value);
    if (addr) onSelect(addr);
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-1 mb-1.5">
        <MapPin className="w-3 h-3 text-primary" /> {label}
      </Label>
      <Select value={selected} onValueChange={handleSelect}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={loading ? "جاري التحميل..." : "اختر من عناوينك المحفوظة"} />
        </SelectTrigger>
        <SelectContent>
          {addresses.map((addr) => (
            <SelectItem key={addr.id} value={addr.id}>
              <span className="flex items-center gap-2">
                <span className="font-medium">{addr.address_name}</span>
                {addr.city && <span className="text-muted-foreground text-xs">- {addr.city}</span>}
              </span>
            </SelectItem>
          ))}
          <SelectItem value="__new">
            <span className="flex items-center gap-1 text-primary">
              <Plus className="w-3 h-3" /> إضافة عنوان جديد
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default AddressSelector;
