import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupplierBookings, updateBookingStatus } from "@/lib/supplierApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { Check, X, Eye, MessageCircle, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const SupplierBookings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [trips, setTrips] = useState<Record<string, any>>({});

  const loadData = async () => {
    if (!user?.id) return;
    const { data } = await getSupplierBookings(user.id);
    const bookingsList = (data || []).filter((b: any) => b.status !== "pending_approval");
    setBookings(bookingsList);

    const customerIds = [...new Set(bookingsList.map((b: any) => b.customer_id))];
    const tripIds = [...new Set(bookingsList.map((b: any) => b.trip_id))];

    if (customerIds.length > 0) {
      const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", customerIds);
      const map: Record<string, any> = {};
      (profilesData || []).forEach((p: any) => { map[p.user_id] = p; });
      setProfiles(map);
    }

    if (tripIds.length > 0) {
      const { data: tripsData } = await supabase.from("trips").select("id, from_city, to_city, departure_time, driver_phone").in("id", tripIds);
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

  const buildWhatsAppText = (booking: any) => {
    const trip = trips[booking.trip_id];
    const profile = profiles[booking.customer_id];
    let text = `📋 تفاصيل حجز جديد:\n`;
    text += `👤 العميل: ${booking.payer_name || profile?.full_name || "—"}\n`;
    text += `📱 الهاتف: ${booking.payer_phone || profile?.phone || "—"}\n`;
    if (trip) {
      text += `🚌 الرحلة: ${trip.from_city} → ${trip.to_city}\n`;
      text += `📅 الموعد: ${new Date(trip.departure_time).toLocaleString("ar")}\n`;
    }
    text += `💺 المقاعد: ${booking.seat_count}\n`;
    text += `💰 المبلغ: ${Number(booking.total_amount).toLocaleString()} ر.ي\n`;
    text += `💳 طريقة الدفع: ${booking.payment_method === "cash" ? "نقداً" : booking.payment_method === "bank_transfer" ? "تحويل بنكي" : booking.payment_method || "—"}\n`;
    if (booking.customer_notes) {
      text += `📝 ملاحظات العميل: ${booking.customer_notes}\n`;
    }
    return text;
  };

  const openWhatsApp = (booking: any, phone: string) => {
    const text = buildWhatsAppText(booking);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
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
              const profile = profiles[booking.customer_id];
              return (
                <Card key={booking.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{booking.payer_name || profile?.full_name || "—"}</span>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <p><span className="font-medium text-foreground">الرحلة:</span> {trip ? `${trip.from_city} → ${trip.to_city}` : "—"}</p>
                    <p><span className="font-medium text-foreground">المقاعد:</span> {booking.seat_count}</p>
                    <p><span className="font-medium text-foreground">المبلغ:</span> {Number(booking.total_amount).toLocaleString()} ر.ي</p>
                    <p><span className="font-medium text-foreground">الدفع:</span> {booking.payment_method === "cash" ? "نقداً" : booking.payment_method === "bank_transfer" ? "تحويل بنكي" : "—"}</p>
                    {booking.customer_notes && (
                      <p><span className="font-medium text-foreground">ملاحظات:</span> {booking.customer_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Button variant="outline" size="sm" className="min-h-[44px] flex-1" onClick={() => setSelectedBooking(booking)}>
                      <Eye className="w-4 h-4 ml-1" />التفاصيل
                    </Button>
                    {trip?.driver_phone && (
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => openWhatsApp(booking, trip.driver_phone)}>
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
                      <TableHead>الهاتف</TableHead>
                      <TableHead>الرحلة</TableHead>
                      <TableHead>المقاعد</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الدفع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const trip = trips[booking.trip_id];
                      const profile = profiles[booking.customer_id];
                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.payer_name || profile?.full_name || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{booking.payer_phone || profile?.phone || "—"}</TableCell>
                          <TableCell>{trip ? `${trip.from_city} → ${trip.to_city}` : "—"}</TableCell>
                          <TableCell>{booking.seat_count}</TableCell>
                          <TableCell>{Number(booking.total_amount).toLocaleString()} ر.ي</TableCell>
                          <TableCell>
                            {booking.payment_method === "cash" ? "نقداً" : booking.payment_method === "bank_transfer" ? "تحويل" : "—"}
                            {booking.payment_receipt_url && (
                              <a href={booking.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="inline-block mr-1">
                                <Image className="w-4 h-4 text-primary inline" />
                              </a>
                            )}
                          </TableCell>
                          <TableCell><StatusBadge status={booking.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setSelectedBooking(booking)}><Eye className="w-4 h-4" /></Button>
                              {trip?.driver_phone && (
                                <Button variant="ghost" size="icon" onClick={() => openWhatsApp(booking, trip.driver_phone)} className="text-green-600"><MessageCircle className="w-4 h-4" /></Button>
                              )}
                              {(booking.status === "pending_approval" || booking.status === "pending") && (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(booking.id, "confirmed")} className="text-green-600"><Check className="w-4 h-4" /></Button>
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

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل الحجز</DialogTitle></DialogHeader>
          {selectedBooking && (() => {
            const trip = trips[selectedBooking.trip_id];
            const profile = profiles[selectedBooking.customer_id];
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">العميل</span>
                    <p className="font-medium">{selectedBooking.payer_name || profile?.full_name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الهاتف</span>
                    <p className="font-medium font-mono">{selectedBooking.payer_phone || profile?.phone || "—"}</p>
                  </div>
                  {trip && (
                    <>
                      <div>
                        <span className="text-muted-foreground">من</span>
                        <p className="font-medium">{trip.from_city}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">إلى</span>
                        <p className="font-medium">{trip.to_city}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">موعد الانطلاق</span>
                        <p className="font-medium">{new Date(trip.departure_time).toLocaleString("ar")}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-muted-foreground">المقاعد</span>
                    <p className="font-medium">{selectedBooking.seat_count}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">المبلغ</span>
                    <p className="font-medium">{Number(selectedBooking.total_amount).toLocaleString()} ر.ي</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">طريقة الدفع</span>
                    <p className="font-medium">{selectedBooking.payment_method === "cash" ? "نقداً" : selectedBooking.payment_method === "bank_transfer" ? "تحويل بنكي" : selectedBooking.payment_method || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">حالة الدفع</span>
                    <p className="font-medium">{selectedBooking.payment_status || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحالة</span>
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                </div>

                {selectedBooking.customer_notes && (
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <span className="text-muted-foreground text-xs">📝 ملاحظات العميل</span>
                    <p className="font-medium mt-1">{selectedBooking.customer_notes}</p>
                  </div>
                )}

                {selectedBooking.payment_receipt_url && (
                  <div className="space-y-2">
                    <span className="text-muted-foreground text-xs">صورة إيصال الدفع</span>
                    <a href={selectedBooking.payment_receipt_url} target="_blank" rel="noopener noreferrer">
                      <img src={selectedBooking.payment_receipt_url} alt="إيصال الدفع" className="max-h-48 rounded-lg border" />
                    </a>
                  </div>
                )}

                {trip?.driver_phone && (
                  <Button className="w-full" variant="outline" onClick={() => openWhatsApp(selectedBooking, trip.driver_phone)}>
                    <MessageCircle className="w-4 h-4 ml-2" />
                    إرسال التفاصيل للسائق عبر واتساب
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierBookings;
