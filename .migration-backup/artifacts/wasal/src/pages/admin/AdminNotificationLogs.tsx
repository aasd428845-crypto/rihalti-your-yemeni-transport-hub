import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bell, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface NotificationLog {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  notification_type: string | null;
  read_at: string | null;
  created_at: string;
  sent_by: string | null;
  data: any;
}

const AdminNotificationLogs = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const notifs = (data || []) as NotificationLog[];
    setLogs(notifs);

    // Fetch profile names
    const userIds = [...new Set(notifs.map((n) => n.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      setProfiles(new Map((profs || []).map((p) => [p.user_id, p.full_name])));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleResend = async (log: NotificationLog) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: log.user_id,
          title: log.title,
          body: log.body || "",
          sound: "default",
          data: log.data || { type: "admin" },
        },
      });
      toast.success("تم إعادة إرسال الإشعار");
    } catch {
      toast.error("فشل إعادة الإرسال");
    }
  };

  const typeLabel = (type: string | null) => {
    const map: Record<string, string> = {
      admin: "إداري",
      system: "نظام",
      booking: "حجز",
      shipment: "شحن",
      promotion: "ترويج",
    };
    return map[type || "system"] || type || "نظام";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">سجل الإشعارات</h1>
            <p className="text-sm text-muted-foreground">{logs.length} إشعار</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">جاري التحميل...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">لا توجد إشعارات</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستلم</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-sm">
                      {profiles.get(log.user_id) || "—"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{log.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{log.body}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {typeLabel(log.notification_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {log.read_at ? (
                        <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="w-3 h-3" />مقروء
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="w-3 h-3" />غير مقروء
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleResend(log)} className="gap-1 text-xs">
                        <RefreshCw className="w-3 h-3" />إعادة
                      </Button>
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

export default AdminNotificationLogs;
