import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getViolationLogs, updateViolationStatus } from "@/lib/accountingApi";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ShieldAlert, Eye, CheckCircle } from "lucide-react";

const typeLabels: Record<string, string> = { phone_number: "رقم هاتف", whatsapp_link: "واتساب", external_contact: "تواصل خارجي", other: "أخرى" };
const severityColors: Record<string, string> = { low: "bg-blue-100 text-blue-800", medium: "bg-yellow-100 text-yellow-800", high: "bg-red-100 text-red-800" };
const statusLabels: Record<string, string> = { pending: "قيد المراجعة", reviewed: "تمت المراجعة", resolved: "تم الحل" };

const AdminViolations = () => {
  const { user } = useAuth();
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getViolationLogs({ status: statusFilter });
    setViolations(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!user) return;
    await updateViolationStatus(id, status, user.id);
    toast.success("تم تحديث حالة المخالفة");
    fetchData();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> سجل المخالفات</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">قيد المراجعة</SelectItem>
            <SelectItem value="reviewed">تمت المراجعة</SelectItem>
            <SelectItem value="resolved">تم الحل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : violations.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا توجد مخالفات مسجلة</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>الخطورة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell><Badge variant="outline">{typeLabels[v.violation_type] || v.violation_type}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{v.details}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs font-medium ${severityColors[v.severity]}`}>{v.severity === "high" ? "عالية" : v.severity === "medium" ? "متوسطة" : "منخفضة"}</span></TableCell>
                    <TableCell className="text-sm">{statusLabels[v.status] || v.status}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(v.created_at), "yyyy/MM/dd HH:mm", { locale: ar })}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {v.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(v.id, "reviewed")}><Eye className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(v.id, "resolved")}><CheckCircle className="w-3 h-3" /></Button>
                          </>
                        )}
                        {v.status === "reviewed" && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(v.id, "resolved")}><CheckCircle className="w-3 h-3" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminViolations;
