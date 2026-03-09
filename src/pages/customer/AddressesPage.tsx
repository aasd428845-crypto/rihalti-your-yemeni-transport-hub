import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAddresses, createAddress, deleteAddress } from "@/lib/customerApi";
import Header from "@/components/landing/Header";
import BackButton from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2, Star, Phone, Navigation } from "lucide-react";
import { getPhoneError, formatYemeniPhone } from "@/lib/phoneValidation";
import MapPicker from "@/components/maps/MapPicker";

const AddressesPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDefault, setFormDefault] = useState(false);
  const [formPhone, setFormPhone] = useState("");
  const [phoneSource, setPhoneSource] = useState("primary");
  const [formLandmark, setFormLandmark] = useState("");
  const [formLat, setFormLat] = useState<number | undefined>();
  const [formLng, setFormLng] = useState<number | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user]);

  const load = async () => {
    if (!user) return;
    try {
      const data = await fetchAddresses(user.id);
      setAddresses(data || []);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  // Get user phone numbers for dropdown
  const userPhones = [];
  if (profile?.phone) userPhones.push({ label: `الأساسي: +967${profile.phone}`, value: profile.phone });
  if ((profile as any)?.phone_secondary) userPhones.push({ label: `الثانوي: +967${(profile as any).phone_secondary}`, value: (profile as any).phone_secondary });

  const handlePhoneSourceChange = (val: string) => {
    setPhoneSource(val);
    if (val === "primary" && profile?.phone) setFormPhone(profile.phone);
    else if (val === "secondary" && (profile as any)?.phone_secondary) setFormPhone((profile as any).phone_secondary);
    else if (val === "custom") setFormPhone("");
  };

  const resetForm = () => {
    setFormName(""); setFormAddress(""); setFormDefault(false);
    setFormPhone(""); setPhoneSource("primary"); setFormLandmark("");
    setFormLat(undefined); setFormLng(undefined);
  };

  const handleAdd = async () => {
    if (!user || !formName.trim() || !formAddress.trim()) {
      toast({ title: "يرجى ملء اسم العنوان والعنوان الكامل", variant: "destructive" });
      return;
    }
    if (formPhone) {
      const phoneErr = getPhoneError(formPhone);
      if (phoneErr) { toast({ title: phoneErr, variant: "destructive" }); return; }
    }
    try {
      await createAddress({
        customer_id: user.id,
        address_name: formName,
        full_address: formAddress,
        is_default: formDefault,
        phone: formPhone || undefined,
        landmark: formLandmark || undefined,
        latitude: formLat,
        longitude: formLng,
      });
      toast({ title: "✅ تم إضافة العنوان بنجاح" });
      setShowForm(false);
      resetForm();
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddress(id);
      toast({ title: "🗑️ تم حذف العنوان" });
      setDeleteConfirm(null);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        <BackButton />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> عناويني
          </h1>
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> إضافة عنوان
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : addresses.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            لا توجد عناوين محفوظة
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <Card key={addr.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        {addr.address_name}
                        {addr.is_default && <span className="inline-flex items-center gap-0.5 text-xs bg-secondary/20 text-secondary px-1.5 py-0.5 rounded-full"><Star className="w-3 h-3 fill-secondary" /> افتراضي</span>}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">{addr.full_address}</p>
                      {addr.phone && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> +967{addr.phone}
                        </p>
                      )}
                      {addr.landmark && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Navigation className="w-3 h-3" /> {addr.landmark}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(addr.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Address Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> إضافة عنوان جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم العنوان <span className="text-destructive">*</span></Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="المنزل، العمل، بيت العائلة..." className="mt-1" />
              </div>
              <div>
                <Label>العنوان الكامل <span className="text-destructive">*</span></Label>
                <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="المدينة، الحي، الشارع، رقم المبنى..." className="mt-1" />
              </div>
              <div>
                <Label>علامة مميزة</Label>
                <Input value={formLandmark} onChange={(e) => setFormLandmark(e.target.value)} placeholder="بجوار مسجد..., مقابل..." className="mt-1" />
              </div>
              
              {/* Phone selector */}
              <div>
                <Label className="flex items-center gap-1"><Phone className="w-3 h-3 text-primary" /> رقم الهاتف للعنوان</Label>
                <Select value={phoneSource} onValueChange={handlePhoneSourceChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profile?.phone && <SelectItem value="primary">الرقم الأساسي: +967{profile.phone}</SelectItem>}
                    {(profile as any)?.phone_secondary && <SelectItem value="secondary">الرقم الثانوي: +967{(profile as any).phone_secondary}</SelectItem>}
                    <SelectItem value="custom">إدخال رقم آخر</SelectItem>
                  </SelectContent>
                </Select>
                {phoneSource === "custom" && (
                  <div className="flex gap-2 mt-2">
                    <div className="flex items-center justify-center bg-muted rounded-md px-3 h-10 text-sm font-medium text-muted-foreground border border-input shrink-0" dir="ltr">+967</div>
                    <Input
                      value={formPhone}
                      onChange={(e) => setFormPhone(formatYemeniPhone(e.target.value))}
                      placeholder="7XX XXX XXX"
                      dir="ltr"
                      maxLength={9}
                    />
                  </div>
                )}
                {formPhone && getPhoneError(formPhone) && <p className="text-xs text-destructive mt-1">{getPhoneError(formPhone)}</p>}
              </div>

              {/* Map */}
              <div>
                <Label>الموقع على الخريطة (اختياري)</Label>
                <div className="mt-1">
                  <MapPicker lat={formLat} lng={formLng} onLocationSelect={(lat, lng) => { setFormLat(lat); setFormLng(lng); }} height="200px" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={formDefault} onChange={(e) => setFormDefault(e.target.checked)} className="accent-primary w-4 h-4" />
                <Star className="w-4 h-4 text-secondary" /> تعيين كعنوان افتراضي
              </label>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleAdd} className="gap-1"><MapPin className="w-4 h-4" /> حفظ العنوان</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="w-5 h-5" /> تأكيد الحذف</DialogTitle></DialogHeader>
            <p className="text-muted-foreground">هل أنت متأكد من حذف هذا العنوان؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
              <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="gap-1"><Trash2 className="w-4 h-4" /> حذف</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AddressesPage;
