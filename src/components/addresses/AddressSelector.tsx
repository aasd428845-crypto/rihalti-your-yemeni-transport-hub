import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAddresses, createAddress } from "@/lib/customerApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Plus, LocateFixed, Phone, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPhoneError, formatYemeniPhone } from "@/lib/phoneValidation";
import MapPicker from "@/components/maps/MapPicker";

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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [locating, setLocating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [phoneSource, setPhoneSource] = useState("primary");
  const [newLandmark, setNewLandmark] = useState("");
  const [newLat, setNewLat] = useState<number | undefined>();
  const [newLng, setNewLng] = useState<number | undefined>();

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

  const handlePhoneSourceChange = (val: string) => {
    setPhoneSource(val);
    if (val === "primary" && profile?.phone) setNewPhone(profile.phone);
    else if (val === "secondary" && (profile as any)?.phone_secondary) setNewPhone((profile as any).phone_secondary);
    else if (val === "custom") setNewPhone("");
  };

  const handleAdd = async () => {
    if (!user || !newName.trim() || !newAddress.trim()) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    if (newPhone) {
      const phoneErr = getPhoneError(newPhone);
      if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    }
    try {
      await createAddress({
        customer_id: user.id,
        address_name: newName,
        full_address: newAddress,
        phone: newPhone || undefined,
        landmark: newLandmark || undefined,
        latitude: newLat,
        longitude: newLng,
      });
      toast({ title: "✅ تم إضافة العنوان" });
      setShowAddForm(false);
      setNewName(""); setNewAddress(""); setNewPhone(""); setNewLandmark("");
      setNewLat(undefined); setNewLng(undefined); setPhoneSource("primary");
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
        toast({ title: "✅ تم تحديد موقعك" });
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
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> إضافة عنوان جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم العنوان <span className="text-destructive">*</span></Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="المنزل، العمل..." className="mt-1" /></div>
            <div><Label>العنوان الكامل <span className="text-destructive">*</span></Label><Input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="المدينة، الحي، الشارع..." className="mt-1" /></div>
            <div><Label>علامة مميزة</Label><Input value={newLandmark} onChange={e => setNewLandmark(e.target.value)} placeholder="بجوار..." className="mt-1" /></div>
            
            {/* Phone selector */}
            <div>
              <Label className="flex items-center gap-1"><Phone className="w-3 h-3 text-primary" /> رقم الهاتف</Label>
              <Select value={phoneSource} onValueChange={handlePhoneSourceChange}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {profile?.phone && <SelectItem value="primary">الأساسي: +967{profile.phone}</SelectItem>}
                  {(profile as any)?.phone_secondary && <SelectItem value="secondary">الثانوي: +967{(profile as any).phone_secondary}</SelectItem>}
                  <SelectItem value="custom">إدخال رقم آخر</SelectItem>
                </SelectContent>
              </Select>
              {phoneSource === "custom" && (
                <div className="flex gap-2 mt-2">
                  <div className="flex items-center justify-center bg-muted rounded-md px-3 h-10 text-sm font-medium text-muted-foreground border border-input shrink-0" dir="ltr">+967</div>
                  <Input value={newPhone} onChange={e => setNewPhone(formatYemeniPhone(e.target.value))} placeholder="7XX XXX XXX" dir="ltr" maxLength={9} />
                </div>
              )}
              {newPhone && getPhoneError(newPhone) && <p className="text-xs text-destructive mt-1">{getPhoneError(newPhone)}</p>}
            </div>

            <div>
              <Label>الموقع على الخريطة</Label>
              <div className="mt-1">
                <MapPicker lat={newLat} lng={newLng} onLocationSelect={(lat, lng) => { setNewLat(lat); setNewLng(lng); }} height="180px" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
            <Button onClick={handleAdd} className="gap-1"><MapPin className="w-4 h-4" /> حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressSelector;
