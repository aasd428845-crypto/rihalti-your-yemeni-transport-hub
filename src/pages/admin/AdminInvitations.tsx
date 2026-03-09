import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Send, Copy, Mail } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { getInvitations, createInvitation, createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";
import type { Invitation } from "@/types/admin.types";

const AdminInvitations = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("supplier");
  const [sending, setSending] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getInvitations();
    setInvitations((data || []) as Invitation[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!email || !user) return;
    setSending(true);
    const { error } = await createInvitation(email, role, user.id);
    if (error) { toast.error("فشل إنشاء الدعوة"); setSending(false); return; }
    createAuditLog(user.id, "إنشاء دعوة", "invitation", undefined, { email, role });
    toast.success("تم إنشاء الدعوة بنجاح");
    setEmail("");
    setSending(false);
    fetchData();
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("تم نسخ الرابط");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الدعوات</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">إنشاء دعوة جديدة</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">البريد الإلكتروني</Label>
              <Input type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs mb-1 block">الدور</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">صاحب مكتب</SelectItem>
                  <SelectItem value="delivery_company">شركة توصيل</SelectItem>
                  <SelectItem value="driver">سائق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={sending || !email}><Send className="w-4 h-4 ml-2" />{sending ? "جاري الإرسال..." : "إنشاء دعوة"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">الدعوات المرسلة</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
              ) : invitations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد دعوات</TableCell></TableRow>
              ) : invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>{inv.role === "supplier" ? "صاحب مكتب" : inv.role === "driver" ? "سائق" : "شركة توصيل"}</TableCell>
                  <TableCell>
                    {inv.used_at ? (
                      <StatusBadge status="completed" />
                    ) : new Date(inv.expires_at) < new Date() ? (
                      <StatusBadge status="cancelled" />
                    ) : (
                      <StatusBadge status="pending" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(inv.expires_at).toLocaleDateString("ar-YE")}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyLink(inv.token)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvitations;
