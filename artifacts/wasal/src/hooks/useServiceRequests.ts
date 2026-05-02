import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServiceRequest, RequestMessage } from '@/types/serviceRequest.types';
import { containsContactInfo, maskReceiverPhone } from '@/lib/contactFilter';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useServiceRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel('service_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const createRequest = async (data: {
    type: 'shipment' | 'delivery' | 'taxi';
    from_city: string;
    to_city: string;
    from_address?: string;
    to_address?: string;
    description?: string;
    quantity?: number;
    notes?: string;
    receiver_name?: string;
    receiver_phone?: string;
    partner_id?: string;
    from_lat?: number;
    from_lng?: number;
    to_lat?: number;
    to_lng?: number;
    distance_km?: number;
    estimated_price?: number;
    service_subtype?: string;
    package_size?: string;
    sender_name?: string;
    sender_phone?: string;
  }) => {
    if (!user) throw new Error('يجب تسجيل الدخول');

    const requestData: any = {
      ...data,
      customer_id: user.id,
      status: 'pending_price',
      receiver_phone_masked: data.receiver_phone ? maskReceiverPhone(data.receiver_phone) : null,
      receiver_phone: data.receiver_phone,
    };

    const { data: newRequest, error } = await supabase
      .from('service_requests' as any)
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;

    if (data.partner_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: data.partner_id,
          title: '🔔 طلب جديد',
          body: `طلب ${data.type === 'shipment' ? 'طرد' : data.type === 'delivery' ? 'توصيل' : 'سيارة أجرة'} جديد من ${data.from_city} إلى ${data.to_city}`,
        } as any);
      } catch (e) { console.error(e); }
    }

    toast({ title: 'تم إرسال طلبك ✅', description: 'سيتم إخطارك عند تحديد السعر' });
    await fetchRequests();
    return newRequest as any as ServiceRequest;
  };

  const sendPrice = async (requestId: string, price: number) => {
    if (!user) throw new Error('يجب تسجيل الدخول');

    const { data: request } = await supabase
      .from('service_requests' as any)
      .select('customer_id, type, from_city, to_city')
      .eq('id', requestId)
      .single();

    const { error } = await supabase
      .from('service_requests' as any)
      .update({
        proposed_price: price,
        status: 'price_sent',
        partner_id: user.id,
      })
      .eq('id', requestId);

    if (error) throw error;

    if (request) {
      const req = request as any;
      try {
        await supabase.from('notifications').insert({
          user_id: req.customer_id,
          title: '💰 وصلك عرض سعر',
          body: `تم تحديد سعر طلبك: ${price.toLocaleString('ar-YE')} ريال`,
        } as any);
      } catch (e) { console.error(e); }
    }

    toast({ title: 'تم إرسال عرض السعر ✅' });
    await fetchRequests();
  };

  const approvePrice = async (requestId: string, paymentMethod: 'cash' | 'bank_transfer') => {
    if (!user) throw new Error('يجب تسجيل الدخول');

    const { data: request } = await supabase
      .from('service_requests' as any)
      .select('partner_id, proposed_price, platform_commission_rate')
      .eq('id', requestId)
      .single();

    if (!request) throw new Error('الطلب غير موجود');
    const req = request as any;

    const commission = Math.floor((req.proposed_price || 0) * (req.platform_commission_rate / 100));

    const { error } = await supabase
      .from('service_requests' as any)
      .update({
        status: 'approved',
        agreed_price: req.proposed_price,
        payment_method: paymentMethod,
        platform_commission: commission,
        partner_net: (req.proposed_price || 0) - commission,
      })
      .eq('id', requestId);

    if (error) throw error;

    if (req.partner_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: req.partner_id,
          title: '✅ تمت الموافقة على الطلب!',
          body: 'وافق العميل على السعر. يمكنك الآن التواصل معه.',
        } as any);
      } catch (e) { console.error(e); }
    }

    toast({ title: 'تمت الموافقة! ✅', description: 'سيتم إرسال معلومات التواصل للشريك' });
    await fetchRequests();
  };

  const rejectPrice = async (requestId: string) => {
    const { error } = await supabase
      .from('service_requests' as any)
      .update({ status: 'cancelled' })
      .eq('id', requestId);
    if (error) throw error;
    toast({ title: 'تم رفض العرض', description: 'يمكنك إرسال الطلب لشريك آخر' });
    await fetchRequests();
  };

  return { requests, loading, createRequest, sendPrice, approvePrice, rejectPrice, refetch: fetchRequests };
}

export function useRequestChat(requestId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [contactWarning, setContactWarning] = useState('');

  useEffect(() => {
    if (!requestId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('request_messages' as any)
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
      setMessages((data as any[]) || []);
    };
    fetchMessages();

    const channel = supabase
      .channel(`chat_${requestId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'request_messages',
        filter: `request_id=eq.${requestId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as any as RequestMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  const sendMessage = async (text: string) => {
    if (!user || !text.trim()) return;
    setContactWarning('');

    if (containsContactInfo(text)) {
      setContactWarning('🔒 لا يمكن مشاركة أرقام الهاتف أو معلومات التواصل قبل إتمام الصفقة');
      return false;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('request_messages' as any).insert({
        request_id: requestId,
        sender_id: user.id,
        sender_role: 'customer',
        message: text.trim(),
      });
      if (error) throw error;
      return true;
    } finally {
      setSending(false);
    }
  };

  return { messages, sending, sendMessage, contactWarning };
}
