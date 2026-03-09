import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getSupplierShipmentRequests, priceShipmentRequest, updateShipmentRequestStatus } from "@/lib/supplierApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Eye, Package, Truck } from "lucide-react";
import { shipmentStatusLabels, shipmentStatusColors } from "@/types/supplier.types";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SupplierShipments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingReq, setPricingReq] = useState<any>(null);
  const [detailReq, setDetailReq] = useState<any>(null);
  const [priceInput, setPriceInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const loadData = async () => {
    if (!user?.id) return;
    const { data } = await getSupplierShipmentRequests(user.id);
    const list = (data || []).filter((r: any) => r.status !== "pending_approval");
    setRequests(list);

    const customerIds = [...new Set(list.map((r: any) => r.customer_id))];
    if (customerIds.length > 0) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name").in("user_id", customerIds);
      const map: Record<string, string> = {};
      (p || []).forEach((pr: any) => { map[pr.user_id] = pr.full_name; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const handlePrice = async () => {
    if (!pricingReq || !priceInput) return;
    const { error } = await priceShipmentRequest(pricingReq.id, Number(priceInput), paymentMethod);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم إرسال السعر للعميل" });
      setPricingReq(null);
      setPriceInput("");
      loadData();
    }
  };

  const handleStatusChange = async (reqId: string, status: string) => {
    const { error } = await updateShipmentRequestStatus(reqId, status);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم تحديث الحالة" });
      loadData();
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl font-bold">إدارة الطرود</h2>

      {requests.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد طلبات شحن حالياً.</CardContent></Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-foreground text-sm">{profiles[req.customer_id] || "—"}</p>
                      <p className="text-xs text-muted-foreground">{req.shipment_type === "door_to_door" ? "باب لباب" : "مكتب لمكتب"}</p>
                    </div>
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", shipmentStatusColors[req.status] || "bg-muted text-muted-foreground")}>
                      {shipmentStatusLabels[req.status] || req.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">الوصف:</span> <span className="font-medium truncate block">{req.item_description || "—"}</span></div>
                    <div><span className="text-muted-foreground">الوزن:</span> <span className="font-medium">{req.item_weight ? `${req.item_weight} كغ` : "—"}</span></div>
                    <div><span className="text-muted-foreground">السعر:</span> <span className="font-medium">{req.price ? `${Number(req.price).toLocaleString()} ر.ي` : "—"}</span></div>
                    <div><span className="text-muted-foreground">التاريخ:</span> <span className="text-xs">{new Date(req.created_at).toLocaleDateString("ar")}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => navigate(`/supplier/order/shipment/${req.id}`)}>
                      <Eye className="w-4 h-4 ml-1" /> عرض
                    </Button>
                    {req.status === "pending_pricing" && (
                      <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => { setPricingReq(req); setPriceInput(""); }}>
                        <DollarSign className="w-4 h-4 ml-1" /> تسعير
                      </Button>
                    )}
                    {req.status === "accepted" && (
                      <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => handleStatusChange(req.id, "accepted")}>
                        <Truck className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العميل</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الوزن</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{profiles[req.customer_id] || "—"}</TableCell>
                        <TableCell>{req.shipment_type === "door_to_door" ? "باب لباب" : "مكتب لمكتب"}</TableCell>
                        <TableCell className="max-w-32 truncate">{req.item_description || "—"}</TableCell>
                        <TableCell>{req.item_weight ? `${req.item_weight} كغ` : "—"}</TableCell>
                        <TableCell>{req.price ? `${Number(req.price).toLocaleString()} ر.ي` : "—"}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", shipmentStatusColors[req.status] || "bg-muted text-muted-foreground")}>
                            {shipmentStatusLabels[req.status] || req.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(req.created_at).toLocaleDateString("ar")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/supplier/order/shipment/${req.id}`)}><Eye className="w-4 h-4" /></Button>
                            {req.status === "pending_pricing" && (
                              <Button variant="ghost" size="icon" onClick={() => { setPricingReq(req); setPriceInput(""); }} className="text-primary">
                                <DollarSign className="w-4 h-4" />
                              </Button>
                            )}
                            {req.status === "accepted" && (
                              <Button variant="ghost" size="icon" onClick={() => handleStatusChange(req.id, "accepted")} className="text-success">
                                <Truck className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Pricing Modal */}
      <Dialog open={!!pricingReq} onOpenChange={() => setPricingReq(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تسعير طلب الشحن</DialogTitle></DialogHeader>
          {pricingReq && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p><strong>الوصف:</strong> {pricingReq.item_description || "—"}</p>
                <p><strong>الوزن:</strong> {pricingReq.item_weight ? `${pricingReq.item_weight} كغ` : "—"}</p>
                <p><strong>من:</strong> {pricingReq.pickup_address || "—"}</p>
                <p><strong>إلى:</strong> {pricingReq.delivery_address || "—"}</p>
              </div>
              <div><Label>السعر (ر.ي)</Label><Input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="أدخل السعر" /></div>
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="direct_to_supplier">دفع مباشر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingReq(null)} className="min-h-[44px]">إلغاء</Button>
            <Button onClick={handlePrice} className="min-h-[44px]">إرسال السعر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={!!detailReq} onOpenChange={() => setDetailReq(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل طلب الشحن</DialogTitle></DialogHeader>
          {detailReq && (
            <div className="space-y-3 text-sm">
              <p><strong>العميل:</strong> {profiles[detailReq.customer_id] || "—"}</p>
              <p><strong>النوع:</strong> {detailReq.shipment_type === "door_to_door" ? "باب لباب" : "مكتب لمكتب"}</p>
              <p><strong>الوصف:</strong> {detailReq.item_description || "—"}</p>
              <p><strong>الوزن:</strong> {detailReq.item_weight ? `${detailReq.item_weight} كغ` : "—"}</p>
              <p><strong>الأبعاد:</strong> {detailReq.item_dimensions || "—"}</p>
              <p><strong>من:</strong> {detailReq.pickup_address || "—"}</p>
              <p><strong>إلى:</strong> {detailReq.delivery_address || "—"}</p>
              <p><strong>المستلم:</strong> {detailReq.recipient_name || "—"} - {detailReq.recipient_phone || "—"}</p>
              <p><strong>السعر:</strong> {detailReq.price ? `${Number(detailReq.price).toLocaleString()} ر.ي` : "لم يتم التسعير"}</p>
              <p><strong>رقم التتبع:</strong> {detailReq.tracking_number || "—"}</p>
              <p><strong>الباركود:</strong> {detailReq.barcode || "—"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierShipments;
