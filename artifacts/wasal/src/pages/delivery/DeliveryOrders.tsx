import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCheck, Eye, XCircle, MessageCircle, ExternalLink, Truck, ChevronRight, ChevronLeft } from "lucide-react";
import { getDeliveryOrders, updateOrderStatus, getRiders, type DeliveryOrderWithRelations, type RiderRow } from "@/lib/deliveryApi";
import { ORDER_STATUS_MAP } from "@/types/delivery.types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isDeliveryRequest, getDeliveryRequestInfo, buildRiderWhatsApp, buildRiderTelegram } from "@/lib/riderMessageBuilder";
import { logNotificationFailure } from "@/lib/notificationFailureLogger";
import { OrderDetailsDialog } from "@/components/delivery/OrderDetailsDialog";
import { AssignRiderDialog } from "@/components/delivery/AssignRiderDialog";

const PAGE_SIZE = 25;

const DeliveryOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<DeliveryOrderWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrderWithRelations | null>(null);
  const [assignOrderId, setAssignOrderId] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [flashedOrderIds, setFlashedOrderIds] = useState<Set<string>>(new Set());

  const statusFilterRef = useRef(statusFilter);
  const loadRef = useRef<(p?: number) => void>(() => {});
  useEffect(() => { statusFilterRef.current = statusFilter; }, [statusFilter]);

  const load = useCallback(async (currentPage = page) => {
    if (!user) return;
    try {
      const [{ data: ordersData, count }, ridersData] = await Promise.all([
        getDeliveryOrders(user.id, statusFilter, currentPage, PAGE_SIZE, search),
        getRiders(user.id),
      ]);
      setOrders(ordersData);
      setTotalCount(count);
      setRiders(ridersData || []);
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, search]);

  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    load(page);
  }, [user, statusFilter, search, page]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "تم تحديث الحالة" });
      const order = orders.find(o => o.id === orderId);
      if (order?.customer_id) {
        const statusLabel = ORDER_STATUS_MAP[status]?.label || status;
        const pushPayload = {
          userId: order.customer_id,
          title: "تحديث حالة الطلب 📦",
          body: `حالة طلبك: ${statusLabel}`,
          sound: "delivery",
          data: { type: "order_status", orderId },
        };
        try {
          await supabase.functions.invoke("send-push-notification", { body: pushPayload });
        } catch (pushErr) {
          logNotificationFailure("send-push-notification", pushPayload, pushErr);
        }
      }
      load();
    } catch (err) {
      toast({ title: "خطأ", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    }
  };

  const flashOrder = useCallback((id: string) => {
    setFlashedOrderIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      setFlashedOrderIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 1500);
  }, []);

  // ── Realtime: smart per-event update ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("delivery-orders-refresh")
      .on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: "delivery_orders", filter: `delivery_company_id=eq.${user.id}` } as never,
        (payload: { eventType: string; new: DeliveryOrderWithRelations; old: DeliveryOrderWithRelations }) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === "INSERT") { setPage(1); loadRef.current(1); return; }
          if (eventType === "UPDATE") {
            const id: string = newRow.id;
            const matchesFilter = statusFilterRef.current === "all" || statusFilterRef.current === newRow.status;
            setOrders(prev => {
              const idx = prev.findIndex(o => o.id === id);
              if (idx === -1) return prev;
              if (!matchesFilter) { setTotalCount(c => Math.max(0, c - 1)); return prev.filter(o => o.id !== id); }
              const updated = [...prev];
              updated[idx] = { ...prev[idx], ...newRow, rider: prev[idx].rider };
              return updated;
            });
            flashOrder(id);
            return;
          }
          if (eventType === "DELETE") {
            const id: string = oldRow.id;
            setOrders(prev => {
              const existed = prev.some(o => o.id === id);
              if (existed) setTotalCount(c => Math.max(0, c - 1));
              return prev.filter(o => o.id !== id);
            });
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, flashOrder]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderActions = (order: DeliveryOrderWithRelations) => (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} className="min-h-[44px] md:min-h-0"><Eye className="w-3 h-3" /></Button>
      {!order.rider_id && order.status !== "cancelled" && (
        <Button size="sm" variant="outline" onClick={() => { setAssignOrderId(order.id); setShowAssign(true); }} className="min-h-[44px] md:min-h-0">
          <UserCheck className="w-3 h-3 ml-1" /> تعيين
        </Button>
      )}
      {order.rider_id && !["cancelled"].includes(order.status ?? "") && (
        <>
          {order.rider?.phone && (
            <Button size="sm" variant="outline" className="min-h-[44px] md:min-h-0 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
              onClick={() => window.open(buildRiderWhatsApp(order, order.rider!.phone!), "_blank")} title="إرسال تفاصيل الطلب للمندوب عبر واتساب">
              <MessageCircle className="w-3 h-3" />
            </Button>
          )}
          <Button size="sm" variant="outline" className="min-h-[44px] md:min-h-0 border-blue-400 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            onClick={() => window.open(buildRiderTelegram(order), "_blank")} title="إرسال تفاصيل الطلب للمندوب عبر تلغرام">
            <ExternalLink className="w-3 h-3" />
          </Button>
        </>
      )}
      {order.status === "assigned" && <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "picked_up")} className="min-h-[44px] md:min-h-0">تم الاستلام</Button>}
      {order.status === "picked_up" && <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order.id, "on_the_way")} className="min-h-[44px] md:min-h-0">في الطريق</Button>}
      {order.status === "on_the_way" && <Button size="sm" onClick={() => handleStatusUpdate(order.id, "delivered")} className="min-h-[44px] md:min-h-0">تم التوصيل</Button>}
      {!["delivered", "cancelled"].includes(order.status ?? "") && (
        <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(order.id, "cancelled")} className="min-h-[44px] md:min-h-0">
          <XCircle className="w-3 h-3" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">
      <h2 className="text-xl md:text-2xl font-bold">إدارة الطلبات</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(ORDER_STATUS_MAP).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-7 h-7 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : orders.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات</CardContent></Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <Card key={order.id} className={`transition-colors duration-700 ${flashedOrderIds.has(order.id) ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{order.customer_name}</p>
                        {isDeliveryRequest(order) && (
                          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                            <Truck className="w-2.5 h-2.5" /> توصيل
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                      {isDeliveryRequest(order) && (() => {
                        const info = getDeliveryRequestInfo(order);
                        return info.pickupAddress ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                            {info.pickupAddress.slice(0, 30)}{info.pickupAddress.length > 30 ? "..." : ""}
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <Badge variant="outline" className={ORDER_STATUS_MAP[order.status ?? ""]?.color || ""}>
                      {ORDER_STATUS_MAP[order.status ?? ""]?.label || order.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-medium">{Number(order.total).toLocaleString()} ر.ي</span></div>
                    <div><span className="text-muted-foreground">المندوب:</span> <span className="font-medium">{order.rider?.full_name || "غير معين"}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">التاريخ:</span> <span className="text-xs">{new Date(order.created_at ?? 0).toLocaleDateString("ar")}</span></div>
                  </div>
                  {renderActions(order)}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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
                {orders.map((order) => (
                  <tr key={order.id} className={`border-b transition-colors duration-700 ${flashedOrderIds.has(order.id) ? "bg-green-50 dark:bg-green-950/30" : "hover:bg-muted/30"}`}>
                    <td className="p-3 font-mono text-xs">{order.id.slice(0, 8)}</td>
                    <td className="p-3"><div>{order.customer_name}</div><div className="text-xs text-muted-foreground">{order.customer_phone}</div></td>
                    <td className="p-3">{Number(order.total).toLocaleString()} ر.ي</td>
                    <td className="p-3">{order.rider?.full_name || <span className="text-muted-foreground">غير معين</span>}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={ORDER_STATUS_MAP[order.status ?? ""]?.color || ""}>
                        {ORDER_STATUS_MAP[order.status ?? ""]?.label || order.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs">{new Date(order.created_at ?? 0).toLocaleDateString("ar")}</td>
                    <td className="p-3">{renderActions(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2" dir="rtl">
              <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages} · {totalCount.toLocaleString()} طلب</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                  <ChevronRight className="w-4 h-4" />السابق
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
                  التالي<ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <OrderDetailsDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} onSuccess={() => load()} />
      <AssignRiderDialog open={showAssign} assignOrderId={assignOrderId} orders={orders} riders={riders} onClose={() => setShowAssign(false)} onSuccess={() => load()} />
    </div>
  );
};

export default DeliveryOrders;
