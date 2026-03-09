import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const SupportChatWidget = () => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getOrCreateConversation = async () => {
    if (!user) return;
    setLoading(true);
    // Find existing open support conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "open")
      .eq("subject", "support")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setConversationId(existing.id);
      await loadMessages(existing.id);
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, subject: "support", status: "open" })
        .select("id")
        .single();
      if (newConv) {
        setConversationId(newConv.id);
        setMessages([]);
      }
    }
    setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  useEffect(() => {
    if (open && !conversationId) getOrCreateConversation();
  }, [open]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`support-chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !conversationId || !user) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: newMsg.trim(),
    });
    // Update conversation timestamp
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    setNewMsg("");
    setSending(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-all"
        aria-label="تواصل مع الدعم"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "420px" }} dir="rtl">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div>
              <p className="font-bold text-sm">الدعم المباشر</p>
              <p className="text-xs opacity-80">نحن هنا لمساعدتك</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                مرحباً {profile?.full_name || ""}! كيف يمكننا مساعدتك؟
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "opacity-70" : "text-muted-foreground"}`}>
                        {format(new Date(msg.created_at), "HH:mm", { locale: ar })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="اكتب رسالتك..."
              className="flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMsg.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
