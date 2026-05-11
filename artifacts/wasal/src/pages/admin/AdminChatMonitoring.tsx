import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, AlertTriangle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminChatMonitoring() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('blocked');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderMessages, setOrderMessages] = useState<any[]>([]);

  const fetchMessages = async () => {
    setLoading(true);
    let query = supabase.from('order_messages' as any).select('*').order('created_at', { ascending: false }).limit(100);
    if (filter === 'blocked') query = query.eq('is_blocked', true);
    const { data } = await query;
    setMessages((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, [filter]);

  const viewConversation = async (orderId: string) => {
    setSelectedOrderId(orderId);
    const { data } = await supabase.from('order_messages' as any)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    setOrderMessages((data as any[]) || []);
  };

  // Also fetch request_messages
  const [requestMsgs, setRequestMsgs] = useState<any[]>([]);
  useEffect(() => {
    const fetchReqMsgs = async () => {
      let query = supabase.from('request_messages' as any).select('*').order('created_at', { ascending: false }).limit(100);
      if (filter === 'blocked') query = query.eq('is_blocked', true);
      const { data } = await query;
      setRequestMsgs((data as any[]) || []);
    };
    fetchReqMsgs();
  }, [filter]);

  const allMessages = [...messages, ...requestMsgs].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> مراقبة المحادثات
        </h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="blocked">المحجوبة فقط</SelectItem>
            <SelectItem value="all">جميع الرسائل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : allMessages.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا توجد رسائل {filter === 'blocked' ? 'محجوبة' : ''}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الرسالة</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMessages.map((msg: any) => (
                  <TableRow key={msg.id}>
                    <TableCell>
                      {msg.is_blocked ? (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />محجوبة</Badge>
                      ) : (
                        <Badge variant="outline">عادية</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{msg.message || msg.message_text}</TableCell>
                    <TableCell className="text-sm">{msg.sender_role || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(msg.created_at).toLocaleString('ar-YE')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => viewConversation(msg.order_id || msg.request_id)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Conversation Detail */}
      <Dialog open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل المحادثة</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {orderMessages.map((msg: any) => (
              <div key={msg.id} className={`p-2 rounded-lg text-sm ${msg.is_blocked ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium">{msg.sender_role}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleTimeString('ar-YE')}</span>
                </div>
                <p>{msg.is_blocked ? '🚫 ' + (msg.block_reason || 'محجوبة') : msg.message}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
