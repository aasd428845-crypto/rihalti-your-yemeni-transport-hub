import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLogs } from "@/lib/adminApi";
import type { AuditLog } from "@/types/admin.types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const AdminReports = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await getAuditLogs();
      setLogs((data || []) as AuditLog[]);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => l.action.toLowerCase().includes(search.toLowerCase()) || l.entity_type?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">التقارير وسجل التدقيق</h2>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث في السجلات..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5" />سجل التدقيق</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الإجراء</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التفاصيل</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
              ) : filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell className="text-sm">{log.entity_type || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.details && Object.keys(log.details).length > 0 ? JSON.stringify(log.details) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString("ar-YE")} {new Date(log.created_at).toLocaleTimeString("ar-YE")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReports;
