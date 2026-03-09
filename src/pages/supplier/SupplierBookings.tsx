import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupplierBookings, updateBookingStatus } from "@/lib/supplierApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { Check, X, Eye, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const SupplierBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [trips, setTrips] = useState<Record<string, any>>({});

  const loadData = async () => {
    if (!user?.id) return;
    const { data } = await getSupplierBookings(user.id);
    // Hide pending_approval items (awaiting admin approval)
    const bookingsList = (data || []).filter((b: any) => b.status !== "pending_approval");
    setBookings(bookingsList);

    // Fetch customer names and trip info
    const customerIds = [...new Set(bookingsList.map((b: any) => b.customer_id))];
    const tripIds = [...new Set(bookingsList.map((b: any) => b.trip_id))];

    if (customerIds.length > 0) {
      const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name").in("user_id", customerIds);
      const map: Record<string, string> = {};
      (profilesData || []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      setProfiles(map);
    }

    if (tripIds.length > 0) {
      const { data: tripsData } = await supabase.from("trips").select("id, from_city, to_city, departure_time").in("id", tripIds);
      const map: Record<string, any> = {};
      (tripsData || []).forEach((t: any) => { map[t.id] = t; });
      setTrips(map);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    const { error } = await updateBookingStatus(bookingId, status);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `تم ${status === "confirmed" ? "تأكيد" : "إلغاء"} الحجز` });
      loadData();
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">إدارة الحجوزات</h2>

      {bookings.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد حجوزات حتى الآن.</CardContent></Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {bookings.map((booking) => {
              const trip = trips[booking.trip_id];
              return (
                <Card key={booking.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{profiles[booking.customer_id] || "—"}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p><span className="font-medium text-foreground">الرحلة:</span> {trip ? `${trip.from_city} → ${trip.to_city}` : "—"}</p>
                    <p><span className="font-medium text-foreground">المقاعد:</span> {booking.seat_count}</p>
                    <p><span className="font-medium text-foreground">المبلغ:</span> {Number(booking.total_amount).toLocaleString()} ر.ي</p>
                    <p><span className="font-medium text-foreground">التاريخ:</span> {new Date(booking.created_at).toLocaleDateString("ar")}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="outline" size="sm" className="min-h-[44px] flex-1" onClick={() => setSelectedBooking(booking)}>
                      <Eye className="w-4 h-4 ml-1" />التفاصيل
                    </Button>
                    {booking.status === "confirmed" && trip?.driver_phone && (
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => {
                        const text = `تفاصيل حجز:\nالعميل: ${profiles[booking.customer_id] || "—"}\nالرحلة: ${trip.from_city} → ${trip.to_city}\nالمقاعد: ${booking.seat_count}\nالمبلغ: ${Number(booking.total_amount).toLocaleString()} ر.ي`;
                        window.open(`https://wa.me/${trip.driver_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
                      }}>
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {(booking.status === "pending_approval" || booking.status === "pending") && (
                      <>
                        <Button size="sm" className="min-h-[44px]" onClick={() => handleStatusUpdate(booking.id, "confirmed")}><Check className="w-4 h-4" /></Button>
                        <Button size="sm" variant="destructive" className="min-h-[44px]" onClick={() => handleStatusUpdate(booking.id, "cancelled")}><X className="w-4 h-4" /></Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>العميل</TableHead>
                      <TableHead>الرحلة</TableHead>
                      <TableHead>المقاعد</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const trip = trips[booking.trip_id];
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{profiles[booking.customer_id] || "—"}</TableCell>
                          <TableCell>{trip ? `${trip.from_city} → ${trip.to_city}` : "—"}</TableCell>
                          <TableCell>{booking.seat_count}</TableCell>
                          <TableCell>{Number(booking.total_amount).toLocaleString()} ر.ي</TableCell>
                          <TableCell><StatusBadge status={booking.status} /></TableCell>
                          <TableCell className="text-sm">{new Date(booking.created_at).toLocaleDateString("ar")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedBooking(booking)}><Eye className="w-4 h-4" /></Button>
                              {booking.status === "confirmed" && trip?.driver_phone && (
                                <Button variant="ghost" size="icon" onClick={() => {
                                  const text = `تفاصيل حجز:\nالعميل: ${profiles[booking.customer_id] || "—"}\nالرحلة: ${trip.from_city} → ${trip.to_city}\nالمقاعد: ${booking.seat_count}\nالمبلغ: ${Number(booking.total_amount).toLocaleString()} ر.ي\nالتاريخ: ${new Date(booking.created_at).toLocaleDateString("ar")}`;
                                  window.open(`https://wa.me/${trip.driver_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
                                }} className="text-[hsl(var(--success))]"><MessageCircle className="w-4 h-4" /></Button>
                              )}
                              {(booking.status === "pending_approval" || booking.status === "pending") && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(booking.id, "confirmed")} className="text-[hsl(var(--success))]"><Check className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(booking.id, "cancelled")} className="text-destructive"><X className="w-4 h-4" /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تفاصيل الحجز</DialogTitle></DialogHeader>
          {selectedBooking && (
            <div className="space-y-3 text-sm">
              <p><strong>العميل:</strong> {profiles[selectedBooking.customer_id] || "—"}</p>
              <p><strong>عدد المقاعد:</strong> {selectedBooking.seat_count}</p>
              <p><strong>المبلغ:</strong> {Number(selectedBooking.total_amount).toLocaleString()} ر.ي</p>
              <p><strong>طريقة الدفع:</strong> {selectedBooking.payment_method || "—"}</p>
              <p><strong>حالة الدفع:</strong> {selectedBooking.payment_status}</p>
              <p><strong>الحالة:</strong> <StatusBadge status={selectedBooking.status} /></p>
              <p><strong>التاريخ:</strong> {new Date(selectedBooking.created_at).toLocaleString("ar")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierBookings;
