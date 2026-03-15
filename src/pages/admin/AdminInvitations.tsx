import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Send, Copy, CheckCheck, Link2, RefreshCw } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import { getInvitations, createInvitation, createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";
import type { Invitation } from "@/types/admin.types";

const ROLE_LABELS: Record<string, string> = {
  supplier: "صاحب مكتب (شركة نقل)",
  delivery_company: "شركة توصيل",
  driver: "سائق أجرة",
  delivery_driver: "مندوب توصيل",
};

const AdminInvitations = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("supplier");
  const [sending, setSending] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getInvitations();
    setInvitations((data || []) as Invitation[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!email.trim() || !user) return;
    setSending(true);
    setGeneratedLink("");
    try {
      const { data, error } = await createInvitation(email.trim(), role, user.id);
      if (error) { toast.error("فشل إنشاء الدعوة: " + error.message); return; }

      const token = (data as any)?.[0]?.token || (data as any)?.token;
      if (token) {
        const link = `${window.location.origin}/invite/${token}`;
        setGeneratedLink(link);
      }

      createAuditLog(user.id, "إنشاء دعوة", "invitation", undefined, { email, role });
      toast.success("تم إنشاء الدعوة بنجاح");
      setEmail("");
      fetchData();
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("تم نسخ الرابط");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("تعذر النسخ — يرجى النسخ يدوياً");
    }
  };

  const copyInviteLink = (token: string) => {
    copyLink(`${window.location.origin}/invite/${token}`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">الدعوات</h2>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Create Invitation */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="w-4 h-4" />إنشاء رابط دعوة جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label className="text-xs mb-1 block">البريد الإلكتروني</Label>
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="w-full sm:w-52">
              <Label className="text-xs mb-1 block">نوع الحساب</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">صاحب مكتب (شركة نقل)</SelectItem>
                  <SelectItem value="delivery_company">شركة توصيل</SelectItem>
                  <SelectItem value="driver">سائق أجرة</SelectItem>
                  <SelectItem value="delivery_driver">مندوب توصيل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={sending || !email.trim()} className="w-full sm:w-auto min-h-[40px]">
                <Send className="w-4 h-4 ml-2" />
                {sending ? "جاري الإنشاء..." : "إنشاء الرابط"}
              </Button>
            </div>
          </div>

          {/* Generated Link Box */}
          {generatedLink && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">✅ تم إنشاء الرابط بنجاح — انسخه وأرسله للمستخدم:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white dark:bg-black/30 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2 break-all select-all text-green-900 dark:text-green-200">
                  {generatedLink}
                </code>
                <Button
                  size="sm"
                  className={`shrink-0 gap-1 ${copied ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => copyLink(generatedLink)}
                >
                  {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </Button>
              </div>
              <p className="text-xs text-green-700 dark:text-green-400">الرابط صالح لمدة 7 أيام — نوع الحساب: {ROLE_LABELS[role]}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader><CardTitle className="text-base">الدعوات المرسلة ({invitations.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">جاري التحميل...</div>
            ) : invitations.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">لا توجد دعوات بعد</div>
            ) : invitations.map(inv => (
              <div key={inv.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[inv.role] || inv.role}</p>
                  </div>
                  {inv.used_at ? (
                    <StatusBadge status="completed" />
                  ) : new Date(inv.expires_at) < new Date() ? (
                    <StatusBadge status="cancelled" />
                  ) : (
                    <StatusBadge status="pending" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">ينتهي: {new Date(inv.expires_at).toLocaleDateString("ar-YE")}</p>
                  {!inv.used_at && new Date(inv.expires_at) >= new Date() && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyInviteLink(inv.token)}>
                      <Copy className="w-3 h-3" />نسخ الرابط
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>نوع الحساب</TableHead>
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
              ) : invitations.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{ROLE_LABELS[inv.role] || inv.role}</Badge>
                  </TableCell>
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
                    {!inv.used_at && new Date(inv.expires_at) >= new Date() && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyInviteLink(inv.token)} title="نسخ الرابط">
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
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
