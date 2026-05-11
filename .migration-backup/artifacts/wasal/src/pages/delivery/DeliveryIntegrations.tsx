import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Copy, Link2, Trash2, CheckCircle, XCircle, Building } from "lucide-react";
import { getCustomLinks, createCustomLink, deleteCustomLink, getPartnerRequests, updatePartnerRequest, createRestaurant } from "@/lib/deliveryApi";
import { useToast } from "@/hooks/use-toast";
import type { CustomLink, PartnerJoinRequest } from "@/types/delivery.types";

const DeliveryIntegrations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [requests, setRequests] = useState<PartnerJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ merchant_name: "", merchant_phone: "" });

  const load = async () => {
    if (!user) return;
    try {
      const [l, r] = await Promise.all([getCustomLinks(user.id), getPartnerRequests(user.id)]);
      setLinks(l || []);
      setRequests(r || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const handleCreateLink = async () => {
    if (!user || !form.merchant_name.trim()) return;
    try {
      await createCustomLink({ ...form, delivery_company_id: user.id });
      toast({ title: "تم إنشاء الرابط" });
      setShowAdd(false);
      setForm({ merchant_name: "", merchant_phone: "" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteLink = async (id: string) => {
    try { await deleteCustomLink(id); toast({ title: "تم حذف الرابط" }); load(); }
    catch (err: any) { toast({ title: "خطأ", description: err.message, variant: "destructive" }); }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/order/${token}`);
    toast({ title: "تم نسخ الرابط" });
  };

  const handlePartnerRequest = async (id: string, status: string, req: PartnerJoinRequest) => {
    try {
      await updatePartnerRequest(id, { status });
      if (status === "approved" && user) {
        await createRestaurant({
          delivery_company_id: user.id,
          name_ar: req.business_name,
          phone: req.contact_phone,
          address: req.address,
        });
      }
      toast({ title: status === "approved" ? "تمت الموافقة وإنشاء المطعم" : "تم الرفض" });
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">التكامل والشراكات</h2>

      <Tabs defaultValue="links">
        <TabsList><TabsTrigger value="links">الروابط المخصصة</TabsTrigger><TabsTrigger value="partners">طلبات الانضمام</TabsTrigger></TabsList>

        <TabsContent value="links" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 ml-1" /> إنشاء رابط</Button>
          </div>
          {links.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد روابط مخصصة</CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {links.map(l => (
                <Card key={l.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" />{l.merchant_name}</h3>
                      <Badge variant={l.is_active ? "default" : "secondary"}>{l.is_active ? "نشط" : "معطل"}</Badge>
                    </div>
                    {l.merchant_phone && <p className="text-sm text-muted-foreground">📞 {l.merchant_phone}</p>}
                    <p className="text-sm text-muted-foreground">النقرات: {l.clicks}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyLink(l.link_token)}><Copy className="w-3 h-3 ml-1" /> نسخ الرابط</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteLink(l.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          {requests.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات انضمام</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold flex items-center gap-2"><Building className="w-4 h-4" />{r.business_name}</h3>
                        <p className="text-sm text-muted-foreground">{r.business_type === "restaurant" ? "مطعم" : r.business_type}</p>
                        <p className="text-sm">{r.contact_name} - {r.contact_phone}</p>
                        {r.address && <p className="text-sm text-muted-foreground">📍 {r.address}</p>}
                        {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                          {r.status === "pending" ? "قيد المراجعة" : r.status === "approved" ? "مقبول" : "مرفوض"}
                        </Badge>
                        {r.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => handlePartnerRequest(r.id, "approved", r)}><CheckCircle className="w-3 h-3 ml-1" /> قبول</Button>
                            <Button size="sm" variant="destructive" onClick={() => handlePartnerRequest(r.id, "rejected", r)}><XCircle className="w-3 h-3 ml-1" /> رفض</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إنشاء رابط مخصص</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم التاجر *</Label><Input value={form.merchant_name} onChange={e => setForm({...form, merchant_name: e.target.value})} /></div>
            <div><Label>رقم الهاتف</Label><Input value={form.merchant_phone} onChange={e => setForm({...form, merchant_phone: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={handleCreateLink}>إنشاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryIntegrations;
