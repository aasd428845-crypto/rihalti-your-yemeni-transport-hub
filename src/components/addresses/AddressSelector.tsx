import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAddresses, createAddress } from "@/lib/customerApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Plus, LocateFixed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface SelectedAddress {
  id: string;
  address_name: string;
  full_address: string;
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
  showUseMyLocation?: boolean;
  onUseMyLocation?: (lat: number, lng: number) => void;
  className?: string;
}

const AddressSelector = ({ label = "اختر عنوان", onSelect, showUseMyLocation, onUseMyLocation, className }: AddressSelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const load = async () => {
    if (!user) return;
    try {
      const data = await fetchAddresses(user.id);
      setAddresses(data || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const handleSelect = (value: string) => {
    if (value === "__new") {
      setShowAddForm(true);
      return;
    }
    const addr = addresses.find(a => a.id === value);
    if (addr) onSelect(addr);
  };

  const handleAdd = async () => {
    if (!user || !newName.trim() || !newAddress.trim()) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    try {
      await createAddress({ customer_id: user.id, address_name: newName, full_address: newAddress });
      toast({ title: "تم إضافة العنوان ✅" });
      setShowAddForm(false);
      setNewName(""); setNewAddress("");
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUseMyLocation?.(pos.coords.latitude, pos.coords.longitude);
        toast({ title: "✅ تم تحديد موقعك", description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
        setLocating(false);
      },
      () => {
        toast({ title: "تعذر تحديد الموقع", variant: "destructive" });
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className={className}>
      <Label className="flex items-center gap-1 mb-1.5">
        <MapPin className="w-3 h-3 text-primary" /> {label}
      </Label>
      <div className="flex gap-2">
        <Select onValueChange={handleSelect}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={loading ? "جاري التحميل..." : "اختر من عناوينك المحفوظة"} />
          </SelectTrigger>
          <SelectContent>
            {addresses.map((addr) => (
              <SelectItem key={addr.id} value={addr.id}>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{addr.address_name}</span>
                  <span className="text-muted-foreground text-xs">- {addr.full_address?.substring(0, 30)}</span>
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
        {showUseMyLocation && onUseMyLocation && (
          <Button type="button" variant="outline" size="icon" onClick={handleLocateMe} disabled={locating} title="استخدم موقعي الحالي">
            <LocateFixed className={`w-4 h-4 ${locating ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة عنوان جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم العنوان</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="المنزل، العمل..." className="mt-1" /></div>
            <div><Label>العنوان الكامل</Label><Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="المدينة، الحي، الشارع..." className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
            <Button onClick={handleAdd}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressSelector;
