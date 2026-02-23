import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, Package, Bike, Clock, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyBookings, fetchMyShipments, fetchMyDeliveryOrders, createCancellationRequest } from "@/lib/customerApi";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  pending_pricing: "bg-orange-100 text-orange-800",
  priced: "bg-indigo-100 text-indigo-800",
  accepted: "bg-green-100 text-green-800",
  preparing: "bg-blue-100 text-blue-800",
  assigned: "bg-purple-100 text-purple-800",
  picked_up: "bg-cyan-100 text-cyan-800",
  on_the_way: "bg-teal-100 text-teal-800",
  delivered: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  pending_approval: "بانتظار الموافقة",
  pending_pricing: "بانتظار التسعير",
  priced: "تم التسعير",
  accepted: "مقبول",
  preparing: "جاري التحضير",
  assigned: "تم التعيين",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

const HistoryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelModal, setCancelModal] = useState<{ type: string; id: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: () => fetchMyBookings(user!.id),
    enabled: !!user,
  });

  const { data: shipments, isLoading: loadingShipments } = useQuery({
    queryKey: ["my-shipments", user?.id],
    queryFn: () => fetchMyShipments(user!.id),
    enabled: !!user,
  });

  const { data: deliveries, isLoading: loadingDeliveries } = useQuery({
    queryKey: ["my-deliveries", user?.id],
    queryFn: () => fetchMyDeliveryOrders(user!.id),
    enabled: !!user,
  });

  const canCancel = (status: string) => ["pending", "confirmed", "pending_approval"].includes(status);

  const handleCancel = async () => {
    if (!cancelModal || !user || !cancelReason.trim()) {
      toast({ title: "يرجى إدخال سبب الإلغاء", variant: "destructive" });
      return;
    }

    setCancelling(true);
    try {
      await createCancellationRequest({
        user_id: user.id,
        entity_type: cancelModal.type,
        entity_id: cancelModal.id,
        reason: cancelReason,
      });
      toast({ title: "تم إرسال طلب الإلغاء" });
      setCancelModal(null);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["my-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">يرجى تسجيل الدخول لعرض السجل</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">السجل والطلبات</h1>

        <Tabs defaultValue="bookings">
          <TabsList className="mb-6">
            <TabsTrigger value="bookings" className="gap-2"><Bus className="w-4 h-4" /> الرحلات</TabsTrigger>
            <TabsTrigger value="shipments" className="gap-2"><Package className="w-4 h-4" /> الشحنات</TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2"><Bike className="w-4 h-4" /> التوصيلات</TabsTrigger>
          </TabsList>

          {/* Bookings */}
          <TabsContent value="bookings">
            {loadingBookings ? (
              <LoadingSkeleton />
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((b: any) => (
                  <Card key={b.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Bus className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{b.trip?.from_city} → {b.trip?.to_city}</span>
                          <Badge className={statusColors[b.status] || "bg-muted"}>{statusLabels[b.status] || b.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.trip?.departure_time ? format(new Date(b.trip.departure_time), "dd/MM/yyyy HH:mm", { locale: ar }) : "-"}</span>
                          <span>{b.seat_count} مقعد</span>
                          <span className="font-semibold text-foreground">{b.total_amount} ر.ي</span>
                        </div>
                      </div>
                      {canCancel(b.status) && (
                        <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={() => setCancelModal({ type: "booking", id: b.id })}>
                          <XCircle className="w-4 h-4" /> إلغاء
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Bus className="w-12 h-12" />} text="لا توجد حجوزات" />
            )}
          </TabsContent>

          {/* Shipments */}
          <TabsContent value="shipments">
            {loadingShipments ? (
              <LoadingSkeleton />
            ) : shipments && shipments.length > 0 ? (
              <div className="space-y-4">
                {shipments.map((s: any) => (
                  <Card key={s.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{s.pickup_address} → {s.delivery_address}</span>
                          <Badge className={statusColors[s.status] || "bg-muted"}>{statusLabels[s.status] || s.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span>{s.shipment_type === "door_to_door" ? "باب لباب" : "مكتب لمكتب"}</span>
                          {s.price && <span className="font-semibold text-foreground">{s.price} ر.ي</span>}
                          <span>{format(new Date(s.created_at), "dd/MM/yyyy", { locale: ar })}</span>
                        </div>
                      </div>
                      {canCancel(s.status) && (
                        <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={() => setCancelModal({ type: "shipment", id: s.id })}>
                          <XCircle className="w-4 h-4" /> إلغاء
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Package className="w-12 h-12" />} text="لا توجد شحنات" />
            )}
          </TabsContent>

          {/* Deliveries */}
          <TabsContent value="deliveries">
            {loadingDeliveries ? (
              <LoadingSkeleton />
            ) : deliveries && deliveries.length > 0 ? (
              <div className="space-y-4">
                {deliveries.map((d: any) => (
                  <Card key={d.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Bike className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{d.customer_address}</span>
                          <Badge className={statusColors[d.status] || "bg-muted"}>{statusLabels[d.status] || d.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span>{d.order_type === "restaurant" ? "مطعم" : d.order_type === "pharmacy" ? "صيدلية" : d.order_type === "supermarket" ? "سوبرماركت" : "عام"}</span>
                          <span className="font-semibold text-foreground">{d.total} ر.ي</span>
                          <span>{format(new Date(d.created_at), "dd/MM/yyyy", { locale: ar })}</span>
                        </div>
                      </div>
                      {canCancel(d.status) && (
                        <Button variant="outline" size="sm" className="text-destructive gap-1" onClick={() => setCancelModal({ type: "delivery", id: d.id })}>
                          <XCircle className="w-4 h-4" /> إلغاء
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Bike className="w-12 h-12" />} text="لا توجد طلبات توصيل" />
            )}
          </TabsContent>
        </Tabs>

        {/* Cancel Modal */}
        <Dialog open={!!cancelModal} onOpenChange={() => setCancelModal(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>تأكيد الإلغاء</DialogTitle>
            </DialogHeader>
            <Textarea placeholder="سبب الإلغاء *" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelModal(null)}>تراجع</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="animate-pulse"><CardContent className="p-4 h-20" /></Card>
    ))}
  </div>
);

const EmptyState = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="text-center py-16 text-muted-foreground">
    <div className="mx-auto mb-4 opacity-50">{icon}</div>
    <p>{text}</p>
  </div>
);

export default HistoryPage;
