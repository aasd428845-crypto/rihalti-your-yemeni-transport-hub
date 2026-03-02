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
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2, Star } from "lucide-react";

const AddressesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formDefault, setFormDefault] = useState(false);

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

  const handleAdd = async () => {
    if (!user || !formName.trim() || !formAddress.trim()) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    try {
      await createAddress({ customer_id: user.id, address_name: formName, full_address: formAddress, is_default: formDefault });
      toast({ title: "تم إضافة العنوان" });
      setShowForm(false);
      setFormName(""); setFormAddress(""); setFormDefault(false);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا العنوان؟")) return;
    try {
      await deleteAddress(id);
      toast({ title: "تم الحذف" });
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
          <h1 className="text-2xl font-bold text-foreground">عناويني</h1>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1"><Plus className="w-4 h-4" /> إضافة عنوان</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : addresses.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد عناوين محفوظة</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <Card key={addr.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-1">
                        {addr.address_name}
                        {addr.is_default && <Star className="w-3 h-3 text-secondary fill-secondary" />}
                      </p>
                      <p className="text-sm text-muted-foreground">{addr.full_address}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(addr.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إضافة عنوان جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>اسم العنوان</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="المنزل، العمل..." className="mt-1" /></div>
              <div><Label>العنوان الكامل</Label><Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="المدينة، الحي، الشارع..." className="mt-1" /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formDefault} onChange={(e) => setFormDefault(e.target.checked)} className="accent-primary" />
                عنوان افتراضي
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              <Button onClick={handleAdd}>حفظ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AddressesPage;
