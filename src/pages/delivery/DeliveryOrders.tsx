import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserCheck, Eye, XCircle } from "lucide-react";
import { getDeliveryOrders, updateOrderStatus, assignRiderToOrder, getRiders, getOrderTracking } from "@/lib/deliveryApi";
import { ORDER_STATUS_MAP } from "@/types/delivery.types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DeliveryOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState("");
  const [selectedRider, setSelectedRider] = useState("");
  const [tracking, setTracking] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    try {
      const [ordersData, ridersData] = await Promise.all([
        getDeliveryOrders(user.id, statusFilter),
        getRiders(user.id),
      ]);
      setOrders(ordersData || []);
      setRiders(ridersData || []);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user, statusFilter]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "تم تحديث الحالة" });
      // Send notification to customer
      const order = orders.find(o => o.id === orderId);
      if (order?.customer_id) {
        const statusLabel = ORDER_STATUS_MAP[status]?.label || status;
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              userId: order.customer_id,
              title: "تحديث حالة الطلب 📦",
              body: `حالة طلبك: ${statusLabel}`,
              sound: "delivery",
              data: { type: "order_status", orderId },
            },
          });
        } catch {}
      }
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleAssign = async () => {
    if (!selectedRider) return;
    try {
      await assignRiderToOrder(assignOrderId, selectedRider);
      toast({ title: "تم تعيين المندوب بنجاح" });
      setShowAssign(false);
      load();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const viewDetails = async (order: any) => {
    setSelectedOrder(order);
    try {
      const t = await getOrderTracking(order.id);
      setTracking(t || []);
    } catch {}
  };

  const filtered = orders.filter(o =>
    o.customer_name?.includes(search) || o.customer_phone?.includes(search) || o.id.includes(search)
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold">إدارة الطلبات</h2>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(ORDER_STATUS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات</CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-card rounded-lg border">
            <thead><tr className="border-b text-muted-foreground bg-muted/50">
              <th className="text-right p-3">الرقم</th>
              <th className="text-right p-3">العميل</th>
              <th className="text-right p-3">المبلغ</th>
              <th className="text-right p-3">المندوب</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">التاريخ</th>
              <th className="text-right p-3">إجراءات</th>
            </tr></thead>
            <tbody>
              {filtered.map((order: any) => (
                <tr key={order.id} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                  <td className="p-3">
                    <div>{order.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{order.customer_phone}</div>
                  </td>
                  <td className="p-3">{Number(order.total).toLocaleString()} ر.ي</td>
                  <td className="p-3">{order.rider?.full_name || <span className="text-muted-foreground">غير معين</span>}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={ORDER_STATUS_MAP[order.status]?.color || ""}>
                      {ORDER_STATUS_MAP[order.status]?.label || order.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs">{new Date(order.created_at).toLocaleDateString("ar")}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => viewDetails(order)}><Eye className="w-3 h-3" /></Button>
                      {!order.rider_id && order.status !== "cancelled" && (
                        <Button size="sm" variant="outline" onClick={() => { setAssignOrderId(order.id); setShowAssign(true); }}>
                          <UserCheck className="w-3 h-3 ml-1" /> تعيين
                        </Button>
                      )}
                      {order.status === "assigned" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "picked_up")}>تم الاستلام</Button>
                      )}
                      {order.status === "picked_up" && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "on_the_way")}>في الطريق</Button>
                      )}
                      {order.status === "on_the_way" && (
                        <Button size="sm" onClick={() => handleStatusUpdate(order.id, "delivered")}>تم التوصيل</Button>
                      )}
                      {!["delivered", "cancelled"].includes(order.status) && (
                        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(order.id, "cancelled")}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل الطلب</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">العميل:</span> {selectedOrder.customer_name}</div>
                <div><span className="text-muted-foreground">الهاتف:</span> {selectedOrder.customer_phone}</div>
                <div><span className="text-muted-foreground">العنوان:</span> {selectedOrder.customer_address}</div>
                <div><span className="text-muted-foreground">المبلغ:</span> {Number(selectedOrder.total).toLocaleString()} ر.ي</div>
                <div><span className="text-muted-foreground">التوصيل:</span> {Number(selectedOrder.delivery_fee).toLocaleString()} ر.ي</div>
                <div><span className="text-muted-foreground">الدفع:</span> {selectedOrder.payment_method === "cash" ? "نقداً" : "بطاقة"}</div>
              </div>
              <div>
                <h4 className="font-bold mb-2">العناصر:</h4>
                {(selectedOrder.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between border-b py-1">
                    <span>{item.name} x{item.quantity}</span>
                    <span>{Number(item.price * item.quantity).toLocaleString()} ر.ي</span>
                  </div>
                ))}
              </div>
              {tracking.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2">سجل التتبع:</h4>
                  {tracking.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 py-1 border-b">
                      <Badge variant="outline" className={ORDER_STATUS_MAP[t.status]?.color || ""}>{ORDER_STATUS_MAP[t.status]?.label || t.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ar")}</span>
                      {t.note && <span className="text-xs">- {t.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Rider Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعيين مندوب</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>اختر مندوب</Label>
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger><SelectValue placeholder="اختر مندوب..." /></SelectTrigger>
              <SelectContent>
                {riders.filter(r => r.is_active).map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.full_name} {r.is_online ? "🟢" : "🔴"} - {r.vehicle_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={handleAssign} disabled={!selectedRider}>تعيين</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryOrders;
