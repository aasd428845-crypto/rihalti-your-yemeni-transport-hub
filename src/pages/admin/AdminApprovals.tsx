import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Map, Package, Truck, Users, Bus, MapPin, Calendar } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type UnifiedRequest = {
  id: string;
  source: "trip" | "shipment" | "delivery_order" | "partner_join" | "approval_request" | "booking";
  type_label: string;
  status: string;
  created_at: string;
  details: Record<string, any>;
};

const sourceIcons: Record<string, any> = {
  trip: Bus,
  shipment: Package,
  delivery_order: Truck,
  partner_join: Users,
  approval_request: Clock,
  booking: Users,
};

const AdminApprovals = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UnifiedRequest[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<UnifiedRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const unified: UnifiedRequest[] = [];

    // 1. Pending trips
    const { data: trips } = await supabase
      .from("trips")
      .select("id, from_city, to_city, price, available_seats, bus_company, supplier_id, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (trips) {
      // fetch supplier names
      const supplierIds = trips.map(t => t.supplier_id).filter((v, i, a) => a.indexOf(v) === i);
      const nameMap: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", supplierIds);
        for (const p of (profiles || [])) { nameMap[p.user_id] = p.full_name; }
      }

      for (const t of trips) {
        unified.push({
          id: t.id,
          source: "trip",
          type_label: "رحلة معلقة",
          status: t.status,
          created_at: t.created_at,
          details: {
            from: t.from_city,
            to: t.to_city,
            price: t.price,
            seats: t.available_seats,
            company: t.bus_company,
            supplier: nameMap[t.supplier_id] || "مورد",
          },
        });
      }
    }

    // 2. Pending shipment requests
    const { data: shipments } = await supabase
      .from("shipment_requests")
      .select("id, pickup_address, delivery_address, shipment_type, status, created_at, customer_id, supplier_id")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });

    if (shipments) {
      for (const s of shipments) {
        unified.push({
          id: s.id,
          source: "shipment",
          type_label: "طلب شحن معلق",
          status: "pending",
          created_at: s.created_at || "",
          details: { from: s.pickup_address, to: s.delivery_address, type: s.shipment_type },
        });
      }
    }

    // 3. Pending delivery orders (pending_approval only)
    const { data: deliveryOrders } = await supabase
      .from("delivery_orders")
      .select("id, customer_name, customer_address, total, status, created_at")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });

    if (deliveryOrders) {
      for (const d of deliveryOrders) {
        unified.push({
          id: d.id,
          source: "delivery_order",
          type_label: "طلب توصيل معلق",
          status: "pending",
          created_at: d.created_at || "",
          details: { customer: d.customer_name, address: d.customer_address, total: d.total },
        });
      }
    }

    // 3b. Pending bookings (pending_approval)
    const { data: pendingBookings } = await supabase
      .from("bookings")
      .select("id, customer_id, trip_id, seat_count, total_amount, status, created_at")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });

    if (pendingBookings) {
      // fetch trip info for labels
      const tripIds = [...new Set(pendingBookings.map(b => b.trip_id))];
      const tripMap: Record<string, any> = {};
      if (tripIds.length > 0) {
        const { data: tripData } = await supabase.from("trips").select("id, from_city, to_city").in("id", tripIds);
        for (const t of (tripData || [])) { tripMap[t.id] = t; }
      }
      for (const b of pendingBookings) {
        const trip = tripMap[b.trip_id];
        unified.push({
          id: b.id,
          source: "booking" as any,
          type_label: "حجز معلق",
          status: "pending",
          created_at: b.created_at || "",
          details: {
            seats: b.seat_count,
            amount: b.total_amount,
            from: trip?.from_city,
            to: trip?.to_city,
          },
        });
      }
    }

    // 4. Partner join requests
    const { data: partners } = await supabase
      .from("partner_join_requests")
      .select("id, business_name, contact_phone, business_type, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (partners) {
      for (const p of partners) {
        unified.push({
          id: p.id,
          source: "partner_join",
          type_label: "طلب انضمام شريك",
          status: "pending",
          created_at: p.created_at || "",
          details: { name: p.business_name, phone: p.contact_phone, type: p.business_type },
        });
      }
    }

    // 5. General approval_requests
    const { data: approvals } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (approvals) {
      for (const a of approvals) {
        unified.push({
          id: a.id,
          source: "approval_request",
          type_label: a.type || "طلب عام",
          status: a.status,
          created_at: a.created_at,
          details: { notes: a.admin_notes, data: a.data },
        });
      }
    }

    // Sort by date
    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setRequests(unified);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApprove = async (req: UnifiedRequest) => {
    if (!user) return;
    let error: any = null;

    if (req.source === "trip") {
      const res = await supabase.from("trips").update({ status: "approved" }).eq("id", req.id);
      error = res.error;
    } else if (req.source === "shipment") {
      const res = await supabase.from("shipment_requests").update({ status: "pending_pricing", admin_approved: true }).eq("id", req.id);
      error = res.error;
    } else if (req.source === "delivery_order") {
      const res = await supabase.from("delivery_orders").update({ status: "pending" }).eq("id", req.id);
      error = res.error;
    } else if (req.source === "partner_join") {
      const res = await supabase.from("partner_join_requests").update({ status: "approved" }).eq("id", req.id);
      error = res.error;
    } else if ((req.source as string) === "booking") {
      const res = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", req.id);
      error = res.error;
    } else {
      const res = await supabase.from("approval_requests").update({
        status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq("id", req.id);
      error = res.error;
    }

    if (error) { toast.error("فشل الموافقة"); return; }
    toast.success("تمت الموافقة بنجاح");
    createAuditLog(user.id, "الموافقة على طلب", req.source, req.id);
    fetchAll();
  };

  const handleReject = async () => {
    if (!rejectModal || !user) return;
    const req = rejectModal;
    let error: any = null;

    if (req.source === "trip") {
      const res = await supabase.from("trips").update({ status: "rejected", notes: rejectReason }).eq("id", req.id);
      error = res.error;
    } else if (req.source === "shipment") {
      const res = await supabase.from("shipment_requests").update({ status: "rejected" }).eq("id", req.id);
      error = res.error;
    } else if (req.source === "delivery_order") {
      const res = await supabase.from("delivery_orders").update({ status: "cancelled", cancellation_reason: rejectReason }).eq("id", req.id);
      error = res.error;
    } else if (req.source === "partner_join") {
      const res = await supabase.from("partner_join_requests").update({ status: "rejected", notes: rejectReason }).eq("id", req.id);
      error = res.error;
    } else if ((req.source as string) === "booking") {
      const res = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", req.id);
      error = res.error;
    } else {
      const res = await supabase.from("approval_requests").update({
        status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), admin_notes: rejectReason,
      }).eq("id", req.id);
      error = res.error;
    }

    if (error) { toast.error("فشل الرفض"); return; }
    toast.success("تم رفض الطلب");
    createAuditLog(user.id, "رفض طلب", req.source, req.id, { reason: rejectReason });
    setRejectModal(null);
    setRejectReason("");
    fetchAll();
  };

  const filtered = activeTab === "all" ? requests : requests.filter((r) => r.source === activeTab);
  const pendingCount = requests.length;

  const renderDetails = (req: UnifiedRequest) => {
    const d = req.details;
    if (req.source === "trip") {
      return (
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.from} → {d.to}</p>
          <p>المورد: {d.supplier} | السعر: {d.price?.toLocaleString()} ر.ي | المقاعد: {d.seats}</p>
          {d.company && <p>شركة النقل: {d.company}</p>}
        </div>
      );
    }
    if (req.source === "shipment") {
      return <p className="text-sm text-muted-foreground">من: {d.from} → إلى: {d.to} | النوع: {d.type}</p>;
    }
    if (req.source === "delivery_order") {
      return <p className="text-sm text-muted-foreground">العميل: {d.customer} | العنوان: {d.address} | الإجمالي: {d.total} ر.ي</p>;
    }
    if (req.source === "partner_join") {
      return <p className="text-sm text-muted-foreground">الاسم: {d.name} | الهاتف: {d.phone} | النوع: {d.type}</p>;
    }
    if (req.source === "booking") {
      return <p className="text-sm text-muted-foreground">{d.from} → {d.to} | المقاعد: {d.seats} | المبلغ: {d.amount?.toLocaleString()} ر.ي</p>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">الموافقات</h2>
        {pendingCount > 0 && (
          <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-sm font-medium">
            {pendingCount} طلب معلق
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 w-full max-w-3xl h-auto">
          <TabsTrigger value="all">الكل ({requests.length})</TabsTrigger>
          <TabsTrigger value="trip">رحلات ({requests.filter(r => r.source === "trip").length})</TabsTrigger>
          <TabsTrigger value="booking">حجوزات ({requests.filter(r => r.source === "booking").length})</TabsTrigger>
          <TabsTrigger value="shipment">شحنات ({requests.filter(r => r.source === "shipment").length})</TabsTrigger>
          <TabsTrigger value="delivery_order">توصيل ({requests.filter(r => r.source === "delivery_order").length})</TabsTrigger>
          <TabsTrigger value="partner_join">شركاء ({requests.filter(r => r.source === "partner_join").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-primary/30" />
                <p>لا توجد طلبات معلقة 🎉</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filtered.map((req) => {
                const Icon = sourceIcons[req.source] || Clock;
                return (
                  <Card key={`${req.source}-${req.id}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-1 shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <p className="font-semibold text-foreground">{req.type_label}</p>
                            <p className="text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3 inline ml-1" />
                              {new Date(req.created_at).toLocaleDateString("ar-YE")} — {new Date(req.created_at).toLocaleTimeString("ar-YE")}
                            </p>
                            {renderDetails(req)}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="gap-1 min-h-[44px]" onClick={() => handleApprove(req)}>
                            <CheckCircle className="w-3 h-3" />قبول
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1 min-h-[44px]" onClick={() => setRejectModal(req)}>
                            <XCircle className="w-3 h-3" />رفض
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Modal */}
      <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>سبب الرفض</DialogTitle></DialogHeader>
          <Textarea placeholder="أدخل سبب الرفض..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <DialogFooter>
            <Button variant="destructive" onClick={handleReject}>رفض الطلب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminApprovals;
