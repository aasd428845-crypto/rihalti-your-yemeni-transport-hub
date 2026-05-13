import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Reply, XCircle, Loader2, Mail, Phone, Clock, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SupportMessage {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  user_phone: string | null;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "جديدة", variant: "destructive" },
  read: { label: "مقروءة", variant: "secondary" },
  replied: { label: "تم الرد", variant: "default" },
  closed: { label: "مغلقة", variant: "outline" },
};

const AdminSupportMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyMode, setReplyMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .order("created_at", { ascending: false });
    setMessages((data as SupportMessage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleView = async (msg: SupportMessage) => {
    setSelectedMsg(msg);
    setReplyMode(false);
    setReplyText(msg.admin_reply || "");
    if (msg.status === "pending") {
      await supabase.from("support_messages").update({ status: "read" }).eq("id", msg.id);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "read" } : m));
    }
  };

  const handleReply = async () => {
    if (!selectedMsg || !replyText.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("support_messages").update({
      admin_reply: replyText.trim(),
      replied_by: user.id,
      replied_at: new Date().toISOString(),
      status: "replied",
    }).eq("id", selectedMsg.id);

    if (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: "تم إرسال الرد بنجاح ✅" });
      // Send in-app notification if user_id exists
      if (selectedMsg.user_id) {
        await supabase.from("notifications").insert({
          user_id: selectedMsg.user_id,
          title: "رد على رسالتك",
          body: replyText.trim().substring(0, 200),
        });
      }
      fetchMessages();
      setSelectedMsg(null);
    }
    setSubmitting(false);
  };

  const handleClose = async (id: string) => {
    await supabase.from("support_messages").update({ status: "closed" }).eq("id", id);
    toast({ title: "تم إغلاق التذكرة" });
    fetchMessages();
    setSelectedMsg(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">رسائل الدعم</h1>
          <p className="text-muted-foreground text-sm">إدارة رسائل التواصل والدعم الفني</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {messages.filter((m) => m.status === "pending").length} جديدة
        </Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">لا توجد رسائل دعم حالياً</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المرسل</TableHead>
                <TableHead>الرسالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => {
                const st = statusMap[msg.status] || statusMap.pending;
                return (
                  <TableRow key={msg.id} className={msg.status === "pending" ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <div className="font-medium text-foreground">{msg.user_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {msg.user_phone && <><Phone className="w-3 h-3" />{msg.user_phone}</>}
                        {msg.user_email && <><Mail className="w-3 h-3 mr-2" />{msg.user_email}</>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{msg.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(msg.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleView(msg)}><Eye className="w-4 h-4" /></Button>
                        {msg.status !== "closed" && (
                          <Button size="sm" variant="ghost" onClick={() => handleClose(msg.id)}><XCircle className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedMsg} onOpenChange={() => setSelectedMsg(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              رسالة من {selectedMsg?.user_name}
            </DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                {selectedMsg.user_phone && (
                  <p className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{selectedMsg.user_phone}</p>
                )}
                {selectedMsg.user_email && (
                  <p className="text-sm flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{selectedMsg.user_email}</p>
                )}
                <p className="text-xs text-muted-foreground">{format(new Date(selectedMsg.created_at), "dd MMM yyyy HH:mm", { locale: ar })}</p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-foreground whitespace-pre-wrap">{selectedMsg.message}</p>
              </div>

              {selectedMsg.admin_reply && !replyMode && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-primary mb-1">الرد:</p>
                  <p className="text-foreground whitespace-pre-wrap">{selectedMsg.admin_reply}</p>
                </div>
              )}

              {(replyMode || !selectedMsg.admin_reply) && selectedMsg.status !== "closed" && (
                <div>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedMsg?.status !== "closed" && (
              <>
                {!replyMode && selectedMsg?.admin_reply ? (
                  <Button variant="outline" onClick={() => setReplyMode(true)}>
                    <Reply className="w-4 h-4 ml-2" />تعديل الرد
                  </Button>
                ) : (
                  <Button onClick={handleReply} disabled={submitting || !replyText.trim()}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Reply className="w-4 h-4 ml-2" />}
                    إرسال الرد
                  </Button>
                )}
                <Button variant="destructive" onClick={() => selectedMsg && handleClose(selectedMsg.id)}>
                  <XCircle className="w-4 h-4 ml-2" />إغلاق
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportMessages;
