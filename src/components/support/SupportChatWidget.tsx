import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SupportChatWidgetProps {
  inline?: boolean;
}

const SupportChatWidget = ({ inline = false }: SupportChatWidgetProps) => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(inline);
  const [showOptions, setShowOptions] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const getOrCreateConversation = async () => {
    if (!user) return;
    setLoading(true);
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
    if (open && !conversationId && user) getOrCreateConversation();
  }, [open, user]);

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
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    setNewMsg("");
    setSending(false);
  };

  const handleFloatingClick = () => {
    if (open) {
      setOpen(false);
      setShowOptions(false);
    } else if (user) {
      setOpen(true);
      setShowOptions(false);
    } else {
      setShowOptions(!showOptions);
    }
  };

  /* ─── INLINE MODE ── renders the full chat interface directly ─── */
  if (inline) {
    if (!user) {
      return (
        <div className="rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm" dir="rtl">
          <div className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <div>
              <p className="font-bold">الدعم المباشر</p>
              <p className="text-xs opacity-80">نحن هنا لمساعدتك</p>
            </div>
          </div>
          <div className="p-6 text-center space-y-4">
            <p className="text-muted-foreground text-sm">سجّل دخولك للتواصل مع فريق الدعم مباشرة</p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/967712345678"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />واتساب
              </a>
              <a
                href="tel:+9671234567"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Phone className="w-4 h-4" />اتصال
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-border/40 overflow-hidden bg-card shadow-sm flex flex-col" style={{ height: 420 }} dir="rtl">
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2 shrink-0">
          <MessageCircle className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-bold text-sm">الدعم المباشر</p>
            <p className="text-xs opacity-80">نحن هنا لمساعدتك</p>
          </div>
          <a
            href="https://wa.me/967712345678"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="واتساب"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20">
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
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-background border border-border text-foreground"}`}>
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
        <div className="p-3 border-t border-border flex gap-2 shrink-0">
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
    );
  }

  /* ─── FLOATING MODE (default) ──────────────────────────────────── */
  return (
    <>
      {showOptions && !user && (
        <div className="fixed bottom-24 left-6 z-50 flex flex-col gap-3 animate-fade-in">
          <a href="https://wa.me/967712345678" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-xl hover:border-primary/30 transition-all group">
            <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">واتساب</p>
              <p className="text-xs text-muted-foreground">تواصل عبر واتساب</p>
            </div>
          </a>
          <a href="tel:+9671234567"
            className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-xl hover:border-primary/30 transition-all group">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary-glow" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">اتصل بنا</p>
              <p className="text-xs text-muted-foreground">+967 1 234 567</p>
            </div>
          </a>
        </div>
      )}
      <button
        onClick={handleFloatingClick}
        className="fixed bottom-24 left-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-200"
        aria-label="تواصل مع الدعم"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
      {open && user && (
        <div className="fixed bottom-44 left-6 z-50 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ height: "420px" }} dir="rtl">
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div className="flex-1">
              <p className="font-bold text-sm">الدعم المباشر</p>
              <p className="text-xs opacity-80">نحن هنا لمساعدتك</p>
            </div>
            <a href="https://wa.me/967712345678" target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" title="واتساب">
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
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
          <div className="p-3 border-t border-border flex gap-2">
            <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="اكتب رسالتك..."
              className="flex-1 text-sm" onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} />
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
