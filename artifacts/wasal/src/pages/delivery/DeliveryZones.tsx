import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapPicker from "@/components/maps/MapPicker";

interface DeliveryZone {
  id: string;
  delivery_company_id: string;
  zone_name: string;
  delivery_fee: number;
  estimated_time: string | null;
  is_active: boolean;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  created_at: string;
}

const defaultForm = () => ({
  zone_name: "",
  delivery_fee: 0,
  estimated_time: "",
  center_lat: undefined as number | undefined,
  center_lng: undefined as number | undefined,
  radius_km: 5,
});

const DeliveryZones = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState(defaultForm());

  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [quoteFee, setQuoteFee] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    try {
      const [zonesRes, quotesRes] = await Promise.all([
        supabase
          .from("delivery_zones" as any)
          .select("*")
          .eq("delivery_company_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("delivery_quote_requests" as any)
          .select("*")
          .eq("delivery_company_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);
      setZones((zonesRes.data || []) as any);
      setQuoteRequests((quotesRes.data || []) as any);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("delivery-quotes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "delivery_quote_requests",
        filter: `delivery_company_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSave = async () => {
    if (!user || !form.zone_name.trim()) return;
    try {
      const payload: any = {
        zone_name:      form.zone_name,
        delivery_fee:   form.delivery_fee,
        estimated_time: form.estimated_time || null,
        center_lat:     form.center_lat ?? null,
        center_lng:     form.center_lng ?? null,
        radius_km:      form.radius_km || 5,
        updated_at:     new Date().toISOString(),
      };
      if (editItem) {
        await supabase.from("delivery_zones" as any).update(payload).eq("id", editItem.id);
        toast({ title: "تم تحديث المنطقة" });
      } else {
        await supabase.from("delivery_zones" as any).insert({ ...payload, delivery_company_id: user.id });
        toast({ title: "تمت إضافة المنطقة" });
      }
      setShowDialog(false);
      setEditItem(null);
      setForm(defaultForm());
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from("delivery_zones" as any).delete().eq("id", id);
      toast({ title: "تم حذف المنطقة" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    await supabase.from("delivery_zones" as any).update({ is_active: !zone.is_active }).eq("id", zone.id);
    load();
  };

  const openEdit = (z: DeliveryZone) => {
    setEditItem(z);
    setForm({
      zone_name:      z.zone_name,
      delivery_fee:   z.delivery_fee,
      estimated_time: z.estimated_time || "",
      center_lat:     z.center_lat ?? undefined,
      center_lng:     z.center_lng ?? undefined,
      radius_km:      z.radius_km ?? 5,
    });
    setShowDialog(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(defaultForm());
    setShowDialog(true);
  };

  const handleQuoteReply = async (quoteId: string) => {
    const fee = Number(quoteFee[quoteId]);
    if (!fee || fee <= 0) {
      toast({ title: "أدخل سعر توصيل صحيح", variant: "destructive" });
      return;
    }
    try {
      await supabase.from("delivery_quote_requests" as any).update({
        quoted_fee:  fee,
        status:      "quoted",
        updated_at:  new Date().toISOString(),
      }).eq("id", quoteId);
      const quote = quoteRequests.find((q) => q.id === quoteId);
      if (quote?.order_id) {
        await supabase.from("delivery_orders").update({
          delivery_fee: fee,
          total: Number(quote.subtotal || 0) + fee,
        } as any).eq("id", quote.order_id);
      }
      toast({ title: "تم إرسال التسعيرة للعميل" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">مناطق التغطية والأسعار</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            المناطق المضافة هنا تظهر تلقائياً كخيارات في قائمة المدن للعملاء
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 ml-1" /> إضافة منطقة
        </Button>
      </div>

      {/* Quote Requests */}
      {quoteRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg text-amber-800 dark:text-amber-300">
              🔔 طلبات تسعيرة جديدة ({quoteRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quoteRequests.map((q: any) => (
              <div key={q.id} className="p-3 bg-background rounded-lg border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{q.customer_address}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleString("ar")}
                    </p>
                  </div>
                  <Badge variant="outline">بانتظار التسعيرة</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="سعر التوصيل"
                    value={quoteFee[q.id] || ""}
                    onChange={(e) => setQuoteFee((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">ر.ي</span>
                  <Button size="sm" onClick={() => handleQuoteReply(q.id)}>
                    إرسال التسعيرة
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Zones List */}
      {zones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-medium">لم تقم بإضافة مناطق تغطية بعد</p>
            <p className="text-sm mt-1">
              أضف مناطقك مع تحديد موقعها الجغرافي ليتمكن التطبيق من<br />
              التعرف تلقائياً على موقع العميل
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => (
            <Card key={z.id} className={!z.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-bold">{z.zone_name}</span>
                  </div>
                  <Switch checked={z.is_active} onCheckedChange={() => toggleActive(z)} />
                </div>

                <div className="text-2xl font-bold text-primary">
                  {Number(z.delivery_fee).toLocaleString()} ر.ي
                </div>

                {z.estimated_time && (
                  <p className="text-sm text-muted-foreground">⏱ {z.estimated_time}</p>
                )}

                {/* Geo badge */}
                {z.center_lat ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Navigation className="w-3 h-3" />
                    نطاق {z.radius_km ?? 5} كم — تحديد موقع مفعّل
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ لم يُحدَّد موقع المنطقة بعد
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(z)}>
                    <Edit className="w-3 h-3 ml-1" /> تعديل
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => handleDelete(z.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); if (!v) setEditItem(null); }}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل منطقة" : "إضافة منطقة جديدة"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>اسم المنطقة / المدينة <span className="text-destructive">*</span></Label>
              <Input
                value={form.zone_name}
                onChange={(e) => setForm({ ...form, zone_name: e.target.value })}
                placeholder="مثال: الغُرفة، مريمة، حي الجامعة..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                هذا الاسم سيظهر للعملاء في قائمة اختيار المدينة
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>سعر التوصيل (ر.ي) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  value={form.delivery_fee}
                  onChange={(e) => setForm({ ...form, delivery_fee: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>الوقت المقدر</Label>
                <Input
                  value={form.estimated_time}
                  onChange={(e) => setForm({ ...form, estimated_time: e.target.value })}
                  placeholder="30-45 دقيقة"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Geo section */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Navigation className="w-4 h-4 text-primary" />
                    موقع المنطقة على الخريطة
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    حدد مركز المنطقة ونطاق التغطية — يُستخدم للكشف التلقائي عن موقع العميل
                  </p>
                </div>
                {form.center_lat && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    مُحدَّد ✓
                  </Badge>
                )}
              </div>

              <MapPicker
                lat={form.center_lat}
                lng={form.center_lng}
                onLocationSelect={(lat, lng) => setForm((f) => ({ ...f, center_lat: lat, center_lng: lng }))}
                height="200px"
              />

              <div>
                <Label className="text-sm">
                  نطاق التغطية: <strong className="text-primary">{form.radius_km} كم</strong>
                </Label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={form.radius_km}
                  onChange={(e) => setForm({ ...form, radius_km: Number(e.target.value) })}
                  className="w-full mt-1 accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 كم</span>
                  <span>30 كم</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSave}>{editItem ? "تحديث" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryZones;
