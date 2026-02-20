import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ApprovalRequest = {
  id: string;
  type: string;
  status: string;
  data: any;
  admin_notes: string | null;
  created_at: string;
  requester_id: string;
};

const typeLabels: Record<string, string> = {
  supplier_registration: "تسجيل مورد",
  delivery_registration: "تسجيل شركة توصيل",
  booking: "حجز",
  shipment: "شحنة",
};

const statusLabels: Record<string, string> = {
  pending: "معلق",
  approved: "مقبول",
  rejected: "مرفوض",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const AdminApprovals = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("approval_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("فشل تحديث الطلب");
    } else {
      toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
      fetchRequests();
    }
  };

  const filtered = requests.filter((r) => filterStatus === "all" || r.status === filterStatus);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">الموافقات</h2>
        {pendingCount > 0 && (
          <Badge variant="secondary">{pendingCount} طلب معلق</Badge>
        )}
      </div>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="جميع الحالات" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="pending">معلق</SelectItem>
          <SelectItem value="approved">مقبول</SelectItem>
          <SelectItem value="rejected">مرفوض</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>النوع</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد طلبات</TableCell>
                </TableRow>
              ) : (
                filtered.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{typeLabels[req.type] || req.type}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[req.status]}>{statusLabels[req.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("ar-YE")}
                    </TableCell>
                    <TableCell>
                      {req.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleAction(req.id, "approved")}>
                            <CheckCircle className="w-3 h-3 ml-1" /> قبول
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction(req.id, "rejected")}>
                            <XCircle className="w-3 h-3 ml-1" /> رفض
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">تم المعالجة</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApprovals;
