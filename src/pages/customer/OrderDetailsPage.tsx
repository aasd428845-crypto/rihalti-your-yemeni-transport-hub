import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchShipmentDetails, fetchDeliveryOrderDetails, acceptShipmentPrice, acceptDeliveryPrice, rejectShipmentPrice } from '@/lib/orderApi';
import { supabase } from '@/integrations/supabase/client';
import OrderChat from '@/components/orders/OrderChat';
import BarcodeDisplay from '@/components/orders/BarcodeDisplay';
import BackButton from '@/components/common/BackButton';
import { toast } from '@/hooks/use-toast';
import { Package, Truck, MapPin, Phone, DollarSign, CheckCircle, XCircle, Clock, QrCode } from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار', pending_approval: 'بانتظار الموافقة', pending_pricing: 'بانتظار التسعير',
  priced: 'تم التسعير', accepted: 'مقبول', in_transit: 'قيد النقل', delivered: 'تم التسليم',
  cancelled: 'ملغي', rejected: 'مرفوض',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', pending_approval: 'bg-blue-100 text-blue-800',
  pending_pricing: 'bg-purple-100 text-purple-800', priced: 'bg-orange-100 text-orange-800',
  accepted: 'bg-green-100 text-green-800', delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function OrderDetailsPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [accepting, setAccepting] = useState(false);
  const [supplierProfile, setSupplierProfile] = useState<any>(null);

  const orderType = type as 'shipment' | 'delivery' | 'ride';

  const fetchOrder = async () => {
    if (!id) return;
    try {
      let data;
      if (orderType === 'shipment') {
        data = await fetchShipmentDetails(id);
      } else {
        data = await fetchDeliveryOrderDetails(id);
      }
      setOrder(data);

      // Fetch supplier/partner profile
      const partnerId = data.supplier_id || data.delivery_company_id;
      if (partnerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, city, logo_url')
          .eq('user_id', partnerId)
          .single();
        setSupplierProfile(profile);
      }
    } catch {
      toast({ title: 'خطأ في تحميل الطلب', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id, type]);

  // Realtime subscription for live order updates
  useEffect(() => {
    if (!id || !type) return;
    const table = orderType === 'shipment' ? 'shipment_requests' : 'delivery_orders';
    const channel = supabase
      .channel(`order-detail-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table,
        filter: `id=eq.${id}`,
      }, () => {
        fetchOrder();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, type]);

  const handleAcceptPrice = async () => {
    if (!id) return;
    setAccepting(true);
    try {
      if (orderType === 'shipment') {
        await acceptShipmentPrice(id, paymentMethod);
      } else {
        await acceptDeliveryPrice(id, paymentMethod);
      }
      toast({ title: 'تمت الموافقة على السعر! ✅' });
      fetchOrder();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setAccepting(false);
    }
  };

  const handleRejectPrice = async () => {
    if (!id) return;
    try {
      await rejectShipmentPrice(id);
      toast({ title: 'تم رفض العرض' });
      fetchOrder();
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">الطلب غير موجود</p>
      </div>
    );
  }

  const isAccepted = order.customer_accepted || order.negotiation_status === 'accepted';
  const hasPriceOffer = order.proposed_price && order.negotiation_status === 'offered';
  const Icon = orderType === 'shipment' ? Package : Truck;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <BackButton />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              تفاصيل {orderType === 'shipment' ? 'طلب الشحن' : 'طلب التوصيل'}
            </h1>
            <Badge className={statusColors[order.status] || 'bg-muted'}>
              {statusLabels[order.status] || order.status}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> معلومات الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {orderType === 'shipment' ? (
                <>
                  <p><strong>من:</strong> {order.pickup_address || '—'}</p>
                  <p><strong>إلى:</strong> {order.delivery_address || '—'}</p>
                  <p><strong>المحتوى:</strong> {order.item_description || '—'}</p>
                  {order.item_weight && <p><strong>الوزن:</strong> {order.item_weight} كغ</p>}
                  <p><strong>المستلم:</strong> {order.recipient_name || '—'}</p>
                  <p><strong>هاتف المستلم:</strong> {isAccepted ? order.recipient_phone : '📞 مخفي حتى قبول السعر'}</p>
                </>
              ) : (
                <>
                  <p><strong>العنوان:</strong> {order.customer_address || '—'}</p>
                  <p><strong>الهاتف:</strong> {isAccepted ? order.customer_phone : '📞 مخفي حتى قبول السعر'}</p>
                </>
              )}
              {order.tracking_number && <p><strong>رقم التتبع:</strong> {order.tracking_number}</p>}
            </CardContent>
          </Card>

          {/* Partner Info (after acceptance) */}
          {isAccepted && supplierProfile && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> بيانات الشريك (بعد الموافقة)
                </h3>
                <p className="text-sm"><strong>الاسم:</strong> {supplierProfile.full_name}</p>
                <p className="text-sm flex items-center gap-1"><Phone className="w-3 h-3" /> {supplierProfile.phone || '—'}</p>
              </CardContent>
            </Card>
          )}

          {/* Price Offer */}
          {hasPriceOffer && !isAccepted && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-amber-800">عرض سعر جديد!</h3>
                </div>
                <p className="text-2xl font-black text-amber-900">{Number(order.proposed_price).toLocaleString()} ر.ي</p>

                <div>
                  <label className="text-sm text-amber-700 font-medium block mb-1">طريقة الدفع</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقداً عند الاستلام</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAcceptPrice} disabled={accepting} className="flex-1 gap-2">
                    <CheckCircle className="w-4 h-4" /> {accepting ? 'جاري...' : 'قبول السعر'}
                  </Button>
                  <Button variant="destructive" onClick={handleRejectPrice} className="gap-2">
                    <XCircle className="w-4 h-4" /> رفض
                  </Button>
                </div>

                <p className="text-xs text-amber-600">🔒 بعد القبول سيتم كشف بيانات التواصل وتوليد باركود التسليم</p>
              </CardContent>
            </Card>
          )}

          {/* Waiting for price */}
          {!order.proposed_price && !isAccepted && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-blue-700">بانتظار تحديد السعر من الشريك...</p>
              </CardContent>
            </Card>
          )}

          {/* Barcode */}
          {isAccepted && order.barcode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" /> باركود التسليم</CardTitle>
              </CardHeader>
              <CardContent>
                <BarcodeDisplay barcode={order.barcode} orderId={order.id} orderType={orderType} />
              </CardContent>
            </Card>
          )}

          {/* Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💬 المحادثة</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderChat orderId={order.id} orderType={orderType} isUnlocked={isAccepted} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
