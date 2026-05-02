import { useState, useRef, useEffect } from 'react';
import { Send, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchOrderMessages, sendOrderMessage, OrderType } from '@/lib/orderApi';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  orderId: string;
  orderType: OrderType;
  isUnlocked?: boolean;
}

export default function OrderChat({ orderId, orderType, isUnlocked = false }: Props) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [warning, setWarning] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId) return;
    fetchOrderMessages(orderId).then(setMessages).catch(() => {});

    const channel = supabase
      .channel(`order_chat_${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'order_messages',
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !input.trim()) return;
    setWarning('');
    setSending(true);
    try {
      const { isBlocked } = await sendOrderMessage({
        orderId,
        orderType,
        senderId: user.id,
        senderRole: role || 'customer',
        message: input.trim(),
      });
      if (isBlocked) {
        setWarning('🔒 تم حجب الرسالة — لا يمكن مشاركة معلومات التواصل قبل الموافقة على السعر');
      }
      setInput('');
    } catch {
      setWarning('حدث خطأ في إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ height: '400px' }} dir="rtl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Lock size={14} className={isUnlocked ? 'text-green-500' : 'text-amber-500'} />
        <span className={`text-xs font-semibold ${isUnlocked ? 'text-green-500' : 'text-amber-500'}`}>
          {isUnlocked ? '🔓 دردشة مفتوحة — يمكن التواصل المباشر' : '🔒 دردشة محمية — معلومات التواصل محجوبة'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-10">لا توجد رسائل بعد. ابدأ المحادثة...</p>
        )}
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-start' : 'justify-end'}`}>
            <div className={`rounded-xl px-3 py-2 max-w-[75%] text-sm ${
              msg.is_blocked
                ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                : msg.sender_id === user?.id
                  ? 'bg-primary/10 text-foreground'
                  : 'bg-muted text-foreground'
            }`}>
              {msg.is_blocked ? (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  <span>🚫 رسالة محجوبة — تحتوي على معلومات تواصل</span>
                </div>
              ) : msg.message}
              <div className="text-[10px] text-muted-foreground mt-1 text-left">
                {new Date(msg.created_at).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Warning */}
      {warning && (
        <div className="px-4 py-2 bg-destructive/5 border-t border-destructive/20 flex gap-2 items-center">
          <AlertTriangle size={13} className="text-destructive shrink-0" />
          <span className="text-destructive text-xs">{warning}</span>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={isUnlocked ? 'اكتب رسالتك...' : '🔒 اكتب استفساراتك (بدون أرقام تواصل)'}
          className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-input"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center disabled:opacity-50 shrink-0"
        >
          <Send size={15} className="text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}
