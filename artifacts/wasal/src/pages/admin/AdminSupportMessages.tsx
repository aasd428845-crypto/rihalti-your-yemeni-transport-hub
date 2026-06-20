import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send, ArrowRight, MessageCircle } from "lucide-react";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { DEFAULT_WA_NUMBER, WA_SETTING_KEY } from "@/hooks/useWhatsappNumber";

interface Conversation {
  id: string;
  user_id: string;
  status: string;
  updated_at: string;
  created_at: string;
  user_name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const AdminSupportMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());

  const [waNumber, setWaNumber] = useState(DEFAULT_WA_NUMBER);
  const [waEditOpen, setWaEditOpen] = useState(false);
  const [waEditValue, setWaEditValue] = useState("");
  const [waSaving, setWaSaving] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedConvRef = useRef<Conversation | null>(null);
  selectedConvRef.current = selectedConv;

  const loadWaNumber = useCallback(async () => {
    try {
      const { data } = await ((supabase as any).from("app_settings"))
        .select("value")
        .eq("key", WA_SETTING_KEY)
        .maybeSingle();
      if (data?.value) setWaNumber(data.value);
    } catch { /* table doesn't exist, use default */ }
  }, []);

  const saveWaNumber = async () => {
    if (!waEditValue.trim()) return;
    setWaSaving(true);
    try {
      const { error } = await ((supabase as any).from("app_settings")).upsert(
        { key: WA_SETTING_KEY, value: waEditValue.trim() },
        { onConflict: "key" }
      );
      if (error) throw error;
      setWaNumber(waEditValue.trim());
      setWaEditOpen(false);
      toast({ title: "تم حفظ رقم واتساب ✅" });
    } catch {
      toast({
        title: "لم يتم الحفظ — أنشئ الجدول أولاً",
        description: 'نفّذ في Supabase SQL Editor: CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);',
        variant: "destructive",
      });
    }
    setWaSaving(false);
  };

  const loadMessagesForConv = useCallback(async (convId: string) => {
    setMsgLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    setMsgLoading(false);
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user_id, status, updated_at, created_at")
      .eq("subject", "support")
      .order("updated_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(convs.map((c) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap: Record<string, string> = {};
    for (const p of profiles || []) {
      profileMap[p.id] = p.full_name || "عميل";
    }

    const convIds = convs.map((c) => c.id);
    const { data: allMessages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastMsgMap: Record<string, Message> = {};
    const unreadMap: Record<string, number> = {};
    for (const msg of (allMessages as Message[]) || []) {
      if (!lastMsgMap[msg.conversation_id]) {
        lastMsgMap[msg.conversation_id] = msg;
      }
      const conv = convs.find((c) => c.id === msg.conversation_id);
      if (conv && msg.sender_id === conv.user_id) {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1;
      }
    }

    const result: Conversation[] = convs.map((c) => {
      const lastMsg = lastMsgMap[c.id];
      return {
        id: c.id,
        user_id: c.user_id,
        status: c.status,
        updated_at: c.updated_at,
        created_at: c.created_at,
        user_name: profileMap[c.user_id] || "عميل",
        lastMessage: lastMsg?.content || "لا توجد رسائل",
        lastMessageTime: lastMsg?.created_at || c.created_at,
        unreadCount: unreadMap[c.id] || 0,
      };
    });

    setConversations(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
    loadWaNumber();
  }, [loadConversations, loadWaNumber]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-support-watch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadConversations();
        if (selectedConvRef.current) {
          loadMessagesForConv(selectedConvRef.current.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadConversations, loadMessagesForConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setOpenedIds((prev) => new Set([...prev, conv.id]));
    loadMessagesForConv(conv.id);
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedConv || !user) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: selectedConv.id,
      sender_id: user.id,
      content: newMsg.trim(),
    });
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", selectedConv.id);
    await supabase.from("notifications").insert({
      user_id: selectedConv.user_id,
      title: "رد من فريق الدعم",
      body: newMsg.trim().substring(0, 150),
    });
    setNewMsg("");
    setSending(false);
    loadConversations();
  };

  const totalUnread = conversations.filter(
    (c) => !openedIds.has(c.id) && c.unreadCount > 0
  ).length;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 70px)" }} dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">رسائل الدعم</h1>
          <p className="text-xs text-muted-foreground">إدارة محادثات العملاء</p>
        </div>
        <div className="flex items-center gap-2">
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
              {totalUnread}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setWaEditValue(waNumber); setWaEditOpen(true); }}
            className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">إعداد واتساب</span>
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Conversation list ── */}
        <div
          className={`border-l border-border flex flex-col overflow-y-auto bg-background shrink-0
            ${selectedConv ? "hidden md:flex" : "flex w-full"} md:w-80 lg:w-96`}
        >
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
              <MessageCircle className="w-16 h-16 text-muted-foreground/20 mb-4" />
              <p className="font-semibold text-muted-foreground">لا توجد محادثات دعم</p>
              <p className="text-xs text-muted-foreground/60 mt-1">ستظهر هنا عند تواصل العملاء</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id;
              const isUnread = !openedIds.has(conv.id) && conv.unreadCount > 0;
              const initial = conv.user_name?.[0] || "؟";
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`flex items-center gap-3 px-4 py-3.5 border-b border-border/40 hover:bg-muted/40 transition-colors w-full text-right
                    ${isSelected ? "bg-primary/5 border-r-[3px] border-r-primary" : ""}`}
                >
                  {/* Avatar with unread badge */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-black text-lg">
                      {initial}
                    </div>
                    {isUnread && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                        {conv.user_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessageTime), { locale: ar, addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${isUnread ? "font-semibold text-foreground/90" : "text-muted-foreground"}`}>
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Chat panel ── */}
        {selectedConv ? (
          <div className="flex flex-col flex-1 min-w-0" style={{ background: "var(--chat-bg, #f0f2f5)" }}>

            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border shrink-0">
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setSelectedConv(null)}
              >
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-black text-lg shrink-0">
                {selectedConv.user_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{selectedConv.user_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedConv.status === "open" ? "محادثة مفتوحة" : "مغلقة"}
                </p>
              </div>
            </div>

            {/* Messages scroll area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {msgLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center py-12">
                  <div className="bg-black/10 dark:bg-white/10 rounded-lg px-4 py-2">
                    <p className="text-xs text-muted-foreground">لا توجد رسائل بعد</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender_id !== selectedConv.user_id;
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm
                          ${isAdmin
                            ? "bg-card text-foreground rounded-tl-sm"
                            : "bg-primary text-primary-foreground rounded-tr-sm"
                          }`}
                      >
                        <p className="leading-snug whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isAdmin ? "text-muted-foreground text-right" : "opacity-70 text-left"}`}>
                          {format(new Date(msg.created_at), "HH:mm", { locale: ar })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 bg-card border-t border-border flex items-center gap-2 shrink-0">
              <Input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="اكتب ردك..."
                className="flex-1 rounded-full"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={sending || !newMsg.trim()}
                className="rounded-full w-10 h-10 shrink-0"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </Button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-center bg-muted/10">
            <MessageCircle className="w-20 h-20 text-muted-foreground/20" />
            <p className="text-muted-foreground font-medium">اختر محادثة لعرضها</p>
          </div>
        )}
      </div>

      {/* ── WhatsApp number dialog ── */}
      <Dialog open={waEditOpen} onOpenChange={setWaEditOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <WhatsAppIcon className="w-5 h-5" />
              رقم واتساب الدعم
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                الرقم (بدون +)
              </label>
              <Input
                value={waEditValue}
                onChange={(e) => setWaEditValue(e.target.value)}
                placeholder="967712345678"
                dir="ltr"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                مثال: <span className="font-mono">967712345678</span> (رمز اليمن + الرقم)
              </p>
            </div>

            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-1.5">
              <p className="font-semibold">⚠️ إعداد مرة واحدة فقط</p>
              <p>نفّذ هذا الأمر في Supabase SQL Editor لحفظ الرقم بشكل دائم:</p>
              <code className="block font-mono text-[10px] bg-amber-100 dark:bg-amber-900/40 rounded px-2 py-1 break-all">
                CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);
              </code>
            </div>

            <Button
              onClick={saveWaNumber}
              disabled={waSaving || !waEditValue.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {waSaving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <WhatsAppIcon className="w-4 h-4" />
              }
              حفظ الرقم
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSupportMessages;
