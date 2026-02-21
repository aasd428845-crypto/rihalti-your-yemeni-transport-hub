import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, MessageCircle, Bell, User } from "lucide-react";
import { getConversations, getMessages, sendMessage, sendNotification, getUsers, createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation, Message } from "@/types/admin.types";
import { supabase } from "@/integrations/supabase/client";

const AdminMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  // Notifications tab
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifTarget, setNotifTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchConvs = async () => {
      const { data } = await getConversations();
      setConversations((data || []) as Conversation[]);
      setLoading(false);
    };
    fetchConvs();
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    const fetchMsgs = async () => {
      const { data } = await getMessages(selectedConv);
      setMessages((data || []) as Message[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };
    fetchMsgs();

    const channel = supabase.channel(`messages-${selectedConv}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConv}` },
        (payload) => { setMessages((prev) => [...prev, payload.new as Message]); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || !user) return;
    await sendMessage(selectedConv, user.id, newMessage);
    setNewMessage("");
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !user) return;
    setSending(true);
    const usersData = await getUsers();
    let targetUsers = usersData;
    if (notifTarget !== "all") targetUsers = usersData.filter((u: any) => u.role === notifTarget);
    const userIds = targetUsers.map((u: any) => u.user_id);
    if (userIds.length === 0) { toast.error("لا يوجد مستخدمون في هذه الفئة"); setSending(false); return; }
    const { error } = await sendNotification(userIds, notifTitle, notifBody);
    if (error) { toast.error("فشل الإرسال"); setSending(false); return; }
    createAuditLog(user.id, "إرسال إشعار", "notification", undefined, { target: notifTarget, count: userIds.length });
    toast.success(`تم إرسال الإشعار إلى ${userIds.length} مستخدم`);
    setNotifTitle(""); setNotifBody("");
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الرسائل والإشعارات</h2>

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat"><MessageCircle className="w-4 h-4 ml-1" />المحادثات</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 ml-1" />إرسال إشعار</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[500px]">
            {/* Conversations List */}
            <Card className="md:col-span-1">
              <CardHeader className="py-3"><CardTitle className="text-sm">المحادثات</CardTitle></CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[420px]">
                  {loading ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">جاري التحميل...</p>
                  ) : conversations.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">لا توجد محادثات</p>
                  ) : conversations.map((conv) => (
                    <button
                      key={conv.id}
                      className={`w-full text-right p-3 border-b hover:bg-muted/50 transition-colors ${selectedConv === conv.id ? "bg-primary/5" : ""}`}
                      onClick={() => setSelectedConv(conv.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                        <div>
                          <p className="text-sm font-medium">{conv.subject || "محادثة"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString("ar-YE")}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Window */}
            <Card className="md:col-span-2 flex flex-col">
              <CardHeader className="py-3 border-b"><CardTitle className="text-sm">{selectedConv ? "المحادثة" : "اختر محادثة"}</CardTitle></CardHeader>
              <CardContent className="flex-1 p-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  {!selectedConv ? (
                    <p className="text-center py-12 text-muted-foreground text-sm">اختر محادثة لعرض الرسائل</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center py-12 text-muted-foreground text-sm">لا توجد رسائل</p>
                  ) : messages.map((msg) => (
                    <div key={msg.id} className={`mb-3 flex ${msg.sender_id === user?.id ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${msg.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {msg.content}
                        <p className="text-[10px] opacity-70 mt-1">{new Date(msg.created_at).toLocaleTimeString("ar-YE")}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>
                {selectedConv && (
                  <div className="p-3 border-t flex gap-2">
                    <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="اكتب رسالة..." onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} />
                    <Button size="icon" onClick={handleSendMessage}><Send className="w-4 h-4" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">إرسال إشعار جماعي</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm mb-1 block">الفئة المستهدفة</Label>
                <Select value={notifTarget} onValueChange={setNotifTarget}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                    <SelectItem value="customer">العملاء</SelectItem>
                    <SelectItem value="supplier">الموردون</SelectItem>
                    <SelectItem value="delivery_company">شركات التوصيل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1 block">عنوان الإشعار</Label>
                <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="عنوان الإشعار" />
              </div>
              <div>
                <Label className="text-sm mb-1 block">نص الإشعار</Label>
                <Textarea value={notifBody} onChange={(e) => setNotifBody(e.target.value)} placeholder="محتوى الإشعار..." />
              </div>
              <Button onClick={handleSendNotification} disabled={sending || !notifTitle}><Bell className="w-4 h-4 ml-2" />{sending ? "جاري الإرسال..." : "إرسال الإشعار"}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMessages;
