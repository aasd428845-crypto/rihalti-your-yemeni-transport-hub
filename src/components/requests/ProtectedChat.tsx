import { useState, useRef, useEffect } from 'react';
import { Send, Lock, AlertTriangle } from 'lucide-react';
import { useRequestChat } from '@/hooks/useServiceRequests';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  requestId: string;
  isUnlocked?: boolean;
}

export function ProtectedChat({ requestId, isUnlocked = false }: Props) {
  const { user } = useAuth();
  const { messages, sending, sendMessage, contactWarning } = useRequestChat(requestId);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const success = await sendMessage(input);
    if (success !== false) setInput('');
  };

  return (
    <div style={{
      background: 'rgba(13,27,42,0.95)', borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', height: '400px',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Lock size={15} color={isUnlocked ? '#1EC97D' : '#F59E0B'} />
        <span style={{ color: isUnlocked ? '#1EC97D' : '#F59E0B', fontSize: '13px', fontWeight: '600' }}>
          {isUnlocked ? '🔓 دردشة مفتوحة — يمكن التواصل المباشر' : '🔒 دردشة محمية — معلومات التواصل محجوبة'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8BA8A0', fontSize: '13px', marginTop: '40px' }}>
            لا توجد رسائل بعد. ابدأ المحادثة...
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_id === user?.id ? 'flex-start' : 'flex-end' }}>
            <div style={{
              background: msg.is_blocked ? 'rgba(239,68,68,0.1)' : msg.sender_id === user?.id ? 'rgba(10,124,78,0.2)' : 'rgba(255,255,255,0.06)',
              border: msg.is_blocked ? '1px solid rgba(239,68,68,0.2)' : 'none',
              borderRadius: '12px', padding: '10px 14px', maxWidth: '75%', fontSize: '14px',
              color: msg.is_blocked ? '#EF4444' : '#E8F4F0',
            }}>
              {msg.is_blocked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>رسالة محجوبة — تحتوي على معلومات تواصل</span>
                </div>
              ) : msg.message}
              <div style={{ color: '#8BA8A0', fontSize: '10px', marginTop: '4px', textAlign: 'left' }}>
                {new Date(msg.created_at).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {contactWarning && (
        <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', borderTop: '1px solid rgba(239,68,68,0.2)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertTriangle size={14} color="#EF4444" />
          <span style={{ color: '#EF4444', fontSize: '12px' }}>{contactWarning}</span>
        </div>
      )}

      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px' }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={isUnlocked ? 'اكتب رسالتك...' : '🔒 اكتب استفساراتك (بدون أرقام تواصل)'}
          style={{
            flex: 1, background: 'rgba(22,34,52,0.8)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', color: '#fff', padding: '10px 14px', fontSize: '14px', outline: 'none',
          }} />
        <button onClick={handleSend} disabled={sending || !input.trim()}
          style={{
            background: 'linear-gradient(135deg, #0A7C4E, #12A868)', border: 'none', borderRadius: '10px',
            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1,
          }}>
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}
