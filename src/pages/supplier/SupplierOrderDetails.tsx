import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchShipmentDetails, fetchDeliveryOrderDetails, submitShipmentPrice, submitDeliveryPrice } from '@/lib/orderApi';
import { supabase } from '@/integrations/supabase/client';
import OrderChat from '@/components/orders/OrderChat';
import BarcodeDisplay from '@/components/orders/BarcodeDisplay';
import WhatsAppShareButton from '@/components/orders/WhatsAppShareButton';
import CustomerLocationMap from '@/components/maps/CustomerLocationMap';
import { toast } from '@/hooks/use-toast';
import { Package, Truck, MapPin, Phone, DollarSign, Send, QrCode, User } from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار', pending_pricing: 'بانتظار التسعير', priced: 'تم التسعير',
  accepted: 'مقبول', in_transit: 'قيد النقل', delivered: 'تم التسليم',
  cancelled: 'ملغي', rejected: 'مرفوض',
};

export default function SupplierOrderDetails() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [priceInput, setPriceInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [riders, setRiders] = useState<any[]>([]);

  const orderType = type as 'shipment' | 'delivery';

  const fetchOrder = async () => {
    if (!id) return;
    try {
      const data = orderType === 'shipment'
        ? await fetchShipmentDetails(id)
        : await fetchDeliveryOrderDetails(id);
      setOrder(data);

      const customerId = data.customer_id;
      if (customerId) {
        const { data: profile } = await supabase.from('profiles')
          .select('full_name, phone, city')
          .eq('user_id', customerId)
          .single();
        setCustomerProfile(profile);
      }

      if (user && orderType === 'delivery') {
        const { data: riderList } = await supabase.from('riders')
          .select('id, full_name, phone')
          .eq('delivery_company_id', user.id)
          .eq('is_active', true);
        setRiders(riderList || []);
      }
    } catch {
      toast({ title: 'خطأ في تحميل الطلب', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id, type]);

  const handleSubmitPrice = async () => {
    if (!id || !priceInput) return;
    setSubmitting(true);
    try {
      if (orderType === 'shipment') {
        await submitShipmentPrice(id, Number(priceInput), user!.id);
      } else {
        await submitDeliveryPrice(id, Number(priceInput));
      }
      toast({ title: 'تم إرسال عرض السعر ✅' });
      fetchOrder();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!order) {
    return <p className="text-center py-12 text-muted-foreground">الطلب غير موجود</p>;
  }

  const isAccepted = order.customer_accepted || order.negotiation_status === 'accepted';
  const canPrice = order.status === 'pending_pricing' || (order.negotiation_status === 'pending' && !order.proposed_price);
  const Icon = orderType === 'shipment' ? Package : Truck;

  // Extract location data
  const pickupLat = order.pickup_lat;
  const pickupLng = order.pickup_lng;
  const deliveryLat = order.delivery_lat;
  const deliveryLng = order.delivery_lng;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold">تفاصيل {orderType === 'shipment' ? 'الطرد' : 'التوصيل'}</h2>
          <Badge className="text-xs">{statusLabels[order.status] || order.status}</Badge>
        </div>
      </div>

      {/* Order Info */}
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          {orderType === 'shipment' ? (
            <>
              <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> <strong>من:</strong> {order.pickup_address}</p>
              {order.pickup_landmark && <p className="text-muted-foreground mr-4">📍 أقرب معلم: {order.pickup_landmark}</p>}
              <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" /> <strong>إلى:</strong> {order.delivery_address}</p>
              {order.delivery_landmark && <p className="text-muted-foreground mr-4">📍 أقرب معلم: {order.delivery_landmark}</p>}
              <p><strong>المحتوى:</strong> {order.item_description || '—'}</p>
              {order.item_weight && <p><strong>الوزن:</strong> {order.item_weight} كغ</p>}
              <p className="flex items-center gap-1"><User className="w-3 h-3" /> <strong>المستلم:</strong> {order.recipient_name || '—'}</p>
            </>
          ) : (
            <>
              <p><strong>العميل:</strong> {order.customer_name || '—'}</p>
              <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.customer_address}</p>
            </>
          )}

          {/* Phone visibility */}
          <div className="mt-2 p-2 rounded-lg bg-muted">
            <p className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {isAccepted ? (
                <span className="text-green-600 font-medium">
                  {orderType === 'shipment' ? order.recipient_phone : order.customer_phone}
                </span>
              ) : (
                <span className="text-amber-600">📞 مخفي حتى قبول العميل للسعر</span>
              )}
            </p>
          </div>

          {/* Customer profile info (after acceptance) */}
          {isAccepted && customerProfile && (
            <div className="p-2 rounded-lg bg-green-50 border border-green-200 mt-2">
              <p className="text-green-700 font-medium text-xs">✅ بيانات العميل مكشوفة</p>
              <p className="text-sm">{customerProfile.full_name} — {customerProfile.phone}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Location Maps */}
      {(pickupLat || deliveryLat) && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> مواقع الطلب</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {pickupLat && pickupLng && (
              <CustomerLocationMap
                lat={pickupLat}
                lng={pickupLng}
                address={order.pickup_address}
                landmark={order.pickup_landmark}
                label="موقع الاستلام"
              />
            )}
            {deliveryLat && deliveryLng && (
              <CustomerLocationMap
                lat={deliveryLat}
                lng={deliveryLng}
                address={orderType === 'shipment' ? order.delivery_address : order.customer_address}
                landmark={order.delivery_landmark}
                label="موقع التسليم"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Price Section */}
      {canPrice && (
        <Card className="border-primary/20">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4" /> تحديد السعر</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>السعر (ر.ي)</Label>
              <Input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)} placeholder="أدخل السعر المقترح" />
            </div>
            <Button onClick={handleSubmitPrice} disabled={submitting || !priceInput} className="w-full gap-2">
              <Send className="w-4 h-4" /> {submitting ? 'جاري الإرسال...' : 'إرسال عرض السعر'}
            </Button>
          </CardContent>
        </Card>
      )}

      {order.proposed_price && !isAccepted && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">💰 السعر المقترح: <strong>{Number(order.proposed_price).toLocaleString()} ر.ي</strong> — بانتظار رد العميل</p>
          </CardContent>
        </Card>
      )}

      {order.final_price && isAccepted && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-green-700">✅ السعر المتفق عليه: <strong>{Number(order.final_price).toLocaleString()} ر.ي</strong></p>
          </CardContent>
        </Card>
      )}

      {/* Barcode + WhatsApp (after acceptance) */}
      {isAccepted && order.barcode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" /> باركود التسليم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BarcodeDisplay barcode={order.barcode} orderId={order.id} orderType={orderType} showPrint />
            <WhatsAppShareButton order={order} orderType={orderType} riders={riders} />
          </CardContent>
        </Card>
      )}

      {/* Chat */}
      <Card>
        <CardHeader><CardTitle className="text-base">💬 المحادثة مع العميل</CardTitle></CardHeader>
        <CardContent>
          <OrderChat orderId={order.id} orderType={orderType} isUnlocked={isAccepted} />
        </CardContent>
      </Card>
    </div>
  );
}
