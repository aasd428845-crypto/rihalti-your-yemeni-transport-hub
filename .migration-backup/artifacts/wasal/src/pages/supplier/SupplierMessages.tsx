import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupplierConversations, getConversationMessages, sendSupplierMessage } from "@/lib/supplierApi";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const SupplierMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) loadConversations();
  }, [user?.id]);

  const loadConversations = async () => {
    const { data } = await getSupplierConversations(user!.id);
    const convs = data || [];
    setConversations(convs);

    const userIds = [...new Set(convs.map((c: any) => c.user_id))];
    if (userIds.length > 0) {
      const { data: p } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const map: Record<string, string> = {};
      (p || []).forEach((pr: any) => { map[pr.user_id] = pr.full_name; });
      setProfiles(map);
    }
    setLoading(false);
  };

  const loadMessages = async (conv: any) => {
    setSelectedConv(conv);
    const { data } = await getConversationMessages(conv.id);
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || !user?.id) return;
    await sendSupplierMessage(selectedConv.id, user.id, newMessage);
    setNewMessage("");
    loadMessages(selectedConv);
  };

  // Realtime subscription
  useEffect(() => {
    if (!selectedConv) return;
    const channel = supabase
      .channel(`messages-${selectedConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedConv.id}` }, () => {
        loadMessages(selectedConv);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv?.id]);

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">الرسائل</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1 overflow-hidden">
          <CardHeader className="py-3"><CardTitle className="text-sm">المحادثات</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-300px)]">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">لا توجد محادثات</div>
            ) : conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadMessages(conv)}
                className={cn(
                  "w-full text-right p-3 border-b hover:bg-muted/50 transition-colors",
                  selectedConv?.id === conv.id && "bg-primary/5"
                )}
              >
                <p className="font-medium text-sm">{profiles[conv.user_id] || "مستخدم"}</p>
                <p className="text-xs text-muted-foreground">{conv.subject || "بدون موضوع"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(conv.updated_at).toLocaleDateString("ar")}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {profiles[selectedConv.user_id] || "مستخدم"} - {selectedConv.subject || "بدون موضوع"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("max-w-[75%] p-3 rounded-lg text-sm", msg.sender_id === user?.id ? "bg-primary text-primary-foreground mr-auto" : "bg-muted ml-auto")}>
                    {msg.content}
                    <div className={cn("text-[10px] mt-1", msg.sender_id === user?.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="p-3 border-t flex gap-2">
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="اكتب رسالة..." onKeyDown={(e) => e.key === "Enter" && handleSend()} />
                <Button onClick={handleSend} size="icon"><Send className="w-4 h-4" /></Button>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>اختر محادثة لعرض الرسائل</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SupplierMessages;
