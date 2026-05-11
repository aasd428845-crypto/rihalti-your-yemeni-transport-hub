import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import ConfirmModal from "@/components/admin/common/ConfirmModal";
import { getCancellationRequests, processCancellation, createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";
import type { CancellationRequest } from "@/types/admin.types";
import { entityTypeLabels } from "@/types/admin.types";

const AdminCancellations = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<CancellationRequest | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approved" | "rejected" } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getCancellationRequests();
    setRequests((data || []) as CancellationRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleProcess = async () => {
    if (!confirmAction || !user) return;
    const { error } = await processCancellation(confirmAction.id, confirmAction.action, user.id);
    if (error) { toast.error("فشل المعالجة"); return; }
    toast.success(confirmAction.action === "approved" ? "تمت الموافقة على الإلغاء" : "تم رفض الإلغاء");
    createAuditLog(user.id, `معالجة إلغاء: ${confirmAction.action}`, "cancellation", confirmAction.id);
    setConfirmAction(null);
    fetchData();
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">إدارة الإلغاءات</h2>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">معلقة ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="processed">تمت المعالجة</TabsTrigger>
          <TabsTrigger value="refunds">الاستردادات</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>مبلغ الاسترداد</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                  ) : pendingRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد طلبات إلغاء معلقة</TableCell></TableRow>
                  ) : pendingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{entityTypeLabels[req.entity_type] || req.entity_type}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{req.reason || "—"}</TableCell>
                      <TableCell>{Number(req.refund_amount).toLocaleString()} ر.ي</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-YE")}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setConfirmAction({ id: req.id, action: "approved" })}><CheckCircle className="w-3 h-3 ml-1" />موافقة</Button>
                          <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ id: req.id, action: "rejected" })}><XCircle className="w-3 h-3 ml-1" />رفض</Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedReq(req)}><Eye className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>مبلغ الاسترداد</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد طلبات معالجة</TableCell></TableRow>
                  ) : processedRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{entityTypeLabels[req.entity_type] || req.entity_type}</TableCell>
                      <TableCell><StatusBadge status={req.status} /></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{req.reason || "—"}</TableCell>
                      <TableCell>{Number(req.refund_amount).toLocaleString()} ر.ي</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-YE")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refunds" className="mt-4">
          <Card>
            <CardContent className="py-8 text-center">
              <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">عرض الاستردادات المعلقة والمنجزة</p>
              <div className="mt-4">
                {requests.filter((r) => r.status === "approved").map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{entityTypeLabels[req.entity_type] || req.entity_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString("ar-YE")}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{Number(req.refund_amount).toLocaleString()} ر.ي</p>
                      <StatusBadge status={req.refund_status || "pending"} />
                    </div>
                  </div>
                ))}
                {requests.filter((r) => r.status === "approved").length === 0 && (
                  <p className="text-sm text-muted-foreground">لا توجد استردادات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تفاصيل طلب الإلغاء</DialogTitle></DialogHeader>
          {selectedReq && (
            <div className="space-y-3 text-sm">
              <div><span className="text-muted-foreground">النوع:</span> <strong>{entityTypeLabels[selectedReq.entity_type] || selectedReq.entity_type}</strong></div>
              <div><span className="text-muted-foreground">السبب:</span> <p>{selectedReq.reason || "لم يتم تحديد سبب"}</p></div>
              <div><span className="text-muted-foreground">مبلغ الاسترداد:</span> <strong>{Number(selectedReq.refund_amount).toLocaleString()} ر.ي</strong></div>
              <div><span className="text-muted-foreground">حالة الاسترداد:</span> <StatusBadge status={selectedReq.refund_status || "pending"} /></div>
              <div><span className="text-muted-foreground">التاريخ:</span> {new Date(selectedReq.created_at).toLocaleDateString("ar-YE")}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action */}
      <ConfirmModal
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
        title={confirmAction?.action === "approved" ? "الموافقة على الإلغاء" : "رفض الإلغاء"}
        description={confirmAction?.action === "approved" ? "سيتم الموافقة على الإلغاء وبدء عملية الاسترداد" : "سيتم رفض طلب الإلغاء"}
        onConfirm={handleProcess}
        confirmLabel={confirmAction?.action === "approved" ? "موافقة" : "رفض"}
        variant={confirmAction?.action === "rejected" ? "destructive" : "default"}
      />
    </div>
  );
};

export default AdminCancellations;
