import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Map, Package, Truck } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { entityTypeLabels } from "@/types/admin.types";
import { getPendingApprovals, approveRequest, rejectRequest, createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";

type ApprovalRequest = {
  id: string; type: string; status: string; data: any;
  admin_notes: string | null; created_at: string; requester_id: string;
};

const typeIcons: Record<string, any> = {
  trip: Map, shipment: Package, delivery: Truck,
  supplier_registration: CheckCircle, delivery_registration: Truck, booking: Clock,
};

const AdminApprovals = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getPendingApprovals();
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    if (!user) return;
    const { error } = await approveRequest(id, user.id);
    if (error) { toast.error("فشل الموافقة"); return; }
    toast.success("تمت الموافقة بنجاح");
    createAuditLog(user.id, "الموافقة على طلب", "approval_request", id);
    fetchData();
  };

  const handleReject = async () => {
    if (!rejectModal || !user) return;
    const { error } = await rejectRequest(rejectModal, user.id, rejectReason);
    if (error) { toast.error("فشل الرفض"); return; }
    toast.success("تم رفض الطلب");
    createAuditLog(user.id, "رفض طلب", "approval_request", rejectModal, { reason: rejectReason });
    setRejectModal(null);
    setRejectReason("");
    fetchData();
  };

  const filtered = activeTab === "all" ? requests : requests.filter((r) => r.type === activeTab);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">الموافقات</h2>
        {pendingCount > 0 && <span className="bg-secondary/20 text-secondary-foreground px-3 py-1 rounded-full text-sm font-medium">{pendingCount} طلب معلق</span>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="supplier_registration">موردون</TabsTrigger>
          <TabsTrigger value="delivery_registration">توصيل</TabsTrigger>
          <TabsTrigger value="booking">حجوزات</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات</CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {filtered.map((req) => {
                const Icon = typeIcons[req.type] || Clock;
                return (
                  <Card key={req.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold">{entityTypeLabels[req.type] || req.type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-YE")} — {new Date(req.created_at).toLocaleTimeString("ar-YE")}</p>
                            <StatusBadge status={req.status} />
                            {req.admin_notes && <p className="text-xs text-muted-foreground mt-1">ملاحظات: {req.admin_notes}</p>}
                          </div>
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" onClick={() => handleApprove(req.id)}><CheckCircle className="w-3 h-3 ml-1" />قبول</Button>
                            <Button size="sm" variant="destructive" onClick={() => setRejectModal(req.id)}><XCircle className="w-3 h-3 ml-1" />رفض</Button>
                          </div>
                        )}
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
