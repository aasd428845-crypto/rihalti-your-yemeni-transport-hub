import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, MapPin, ShoppingCart, Utensils, ArrowLeft, ArrowRight,
  CheckCircle, Loader2, Navigation, Link2, User, Phone,
  FileText, Image as ImageIcon, Clock, DollarSign, CreditCard, Banknote,
  ChevronLeft, Info, Tag, Truck, Percent, Gift, AlarmClock, Calendar, BadgeDollarSign, X,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useNotifications } from '@/hooks/useNotifications';
import { YEMENI_CITIES } from '@/lib/contactFilter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { RestaurantPromotion, PromoType } from '@/lib/promotionsApi';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Types ───────────────────────────────────────────────────────────────────
type ServiceType = 'parcel' | 'shopping' | 'food';
type Step = 'pickup' | 'dropoff' | 'details' | 'review';
type PaymentMethod = 'cash' | 'transfer';
type PackageSize = 'small' | 'medium' | 'large';

interface LatLng { lat: number; lng: number }

// ── Constants ────────────────────────────────────────────────────────────────
const PRICE_PER_KM = 500;
const BASE_PRICE = 1000;
const STEPS: Step[] = ['pickup', 'dropoff', 'details', 'review'];
const STEP_LABELS: Record<Step, string> = {
  pickup: 'الاستلام',
  dropoff: 'التسليم',
  details: 'التفاصيل',
  review: 'المراجعة',
};

const SERVICE_TYPES: { id: ServiceType; label: string; icon: React.ComponentType<any>; color: string; desc: string }[] = [
  { id: 'parcel', label: 'نقل طرد', icon: Package, color: '#0A7C4E', desc: 'أرسل بضاعتك أو طرودك' },
  { id: 'shopping', label: 'تسوق من متجر', icon: ShoppingCart, color: '#7C3AED', desc: 'نتسوق عنك من أي متجر' },
  { id: 'food', label: 'توصيل وجبة', icon: Utensils, color: '#EA580C', desc: 'طلب طعام من مطعم' },
];

const SIZE_OPTIONS: { id: PackageSize; label: string; desc: string }[] = [
  { id: 'small', label: 'صغير', desc: 'رسالة / وثائق / هاتف' },
  { id: 'medium', label: 'متوسط', desc: 'حقيبة / صندوق متوسط' },
  { id: 'large', label: 'كبير', desc: 'حمولة كبيرة / عدة صناديق' },
];

// ── Haversine Distance ───────────────────────────────────────────────────────
function calcDistance(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

// ── Parse map link ───────────────────────────────────────────────────────────
function parseMapLink(link: string): LatLng | null {
  // Google Maps: @lat,lng or q=lat,lng or ll=lat,lng
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /maps\.app\.goo\.gl/, // shortened – can't parse without fetch
    /(-?\d+\.\d{4,}),(-?\d+\.\d{4,})/,
  ];
  for (const p of patterns) {
    const m = link.match(p);
    if (m && m[1] && m[2]) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return { lat, lng };
    }
  }
  return null;
}

// ── Map click handler ────────────────────────────────────────────────────────
function MapClickHandler({ onSelect }: { onSelect: (ll: LatLng) => void }) {
  useMapEvents({ click: (e) => onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// ── Mini Map Component ───────────────────────────────────────────────────────
function LocationMap({
  center, marker, onSelect,
}: {
  center: LatLng; marker: LatLng | null; onSelect: (ll: LatLng) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      style={{ height: 200, borderRadius: 12, zIndex: 0 }}
      key={`${center.lat}-${center.lng}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onSelect={onSelect} />
      {marker && <Marker position={[marker.lat, marker.lng]} />}
    </MapContainer>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ShipmentRequestPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { createRequest } = useServiceRequests();
  const { sendPushNotification } = useNotifications();

  // Service & Step
  const [service, setService] = useState<ServiceType>('parcel');
  const [step, setStep] = useState<Step>('pickup');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Pickup
  const [pickupCity, setPickupCity] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLatLng, setPickupLatLng] = useState<LatLng | null>(null);
  const [pickupLink, setPickupLink] = useState('');
  const [pickupMapCenter, setPickupMapCenter] = useState<LatLng>({ lat: 15.3694, lng: 44.1910 }); // Sanaa

  // Dropoff
  const [dropoffCity, setDropoffCity] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLatLng, setDropoffLatLng] = useState<LatLng | null>(null);
  const [dropoffLink, setDropoffLink] = useState('');
  const [dropoffMapCenter, setDropoffMapCenter] = useState<LatLng>({ lat: 15.3694, lng: 44.1910 });

  // Details
  const [description, setDescription] = useState('');
  const [packageSize, setPackageSize] = useState<PackageSize>('medium');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Sender / Receiver
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [iAmSender, setIAmSender] = useState(true);

  // Promotions
  const [promotions, setPromotions] = useState<RestaurantPromotion[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<RestaurantPromotion | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Price
  const distance = pickupLatLng && dropoffLatLng ? calcDistance(pickupLatLng, dropoffLatLng) : null;
  const estimatedPrice = distance != null ? Math.round(BASE_PRICE + distance * PRICE_PER_KM) : null;
  const estimatedTime = distance != null ? Math.round(15 + distance * 2) : null;

  // Fetch all active promotions
  useEffect(() => {
    supabase
      .from('restaurant_promotions' as any)
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setPromotions((data as RestaurantPromotion[]) || []))
      .catch(() => {});
  }, []);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data: addr } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', user.id)
          .eq('is_default', true)
          .maybeSingle();
        if (addr?.city) setPickupCity(addr.city);
        if (addr) {
          const parts = [addr.district, addr.street, addr.building_number, addr.landmark].filter(Boolean);
          if (parts.length) setPickupAddress(parts.join('، '));
        } else if (profile?.city) setPickupCity(profile.city);
        if (profile?.full_name) setSenderName(profile.full_name);
        if (profile?.phone) setSenderPhone(profile.phone);
      } catch {}
    };
    load();
  }, [user?.id]);

  // Sync iAmSender
  useEffect(() => {
    if (iAmSender) {
      setSenderName(profile?.full_name || '');
      setSenderPhone(profile?.phone || '');
    }
  }, [iAmSender, profile]);

  // Parse pickup link
  const applyPickupLink = () => {
    const ll = parseMapLink(pickupLink);
    if (ll) {
      setPickupLatLng(ll);
      setPickupMapCenter(ll);
      toast({ title: 'تم تحديد موقع الاستلام ✅' });
    } else {
      toast({ title: 'تعذّر قراءة الرابط', description: 'تأكد من نسخ رابط الموقع من خرائط جوجل', variant: 'destructive' });
    }
  };

  // Parse dropoff link
  const applyDropoffLink = () => {
    const ll = parseMapLink(dropoffLink);
    if (ll) {
      setDropoffLatLng(ll);
      setDropoffMapCenter(ll);
      toast({ title: 'تم تحديد موقع التسليم ✅' });
    } else {
      toast({ title: 'تعذّر قراءة الرابط', description: 'تأكد من نسخ رابط الموقع من خرائط جوجل', variant: 'destructive' });
    }
  };

  // Get current location
  const getMyLocation = (which: 'pickup' | 'dropoff') => {
    if (!navigator.geolocation) {
      toast({ title: 'المتصفح لا يدعم تحديد الموقع', variant: 'destructive' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (which === 'pickup') { setPickupLatLng(ll); setPickupMapCenter(ll); }
        else { setDropoffLatLng(ll); setDropoffMapCenter(ll); }
        toast({ title: 'تم تحديد موقعك الحالي ✅' });
      },
      () => toast({ title: 'تعذّر تحديد موقعك', variant: 'destructive' }),
    );
  };

  // Handle image
  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Step validation
  const canGoNext = (): boolean => {
    if (step === 'pickup') return !!pickupCity;
    if (step === 'dropoff') return !!dropoffCity;
    if (step === 'details') return !!description;
    return true;
  };

  const nextStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const prevStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  // Submit
  const handleSubmit = async () => {
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      const typeMap: Record<ServiceType, 'shipment' | 'delivery' | 'taxi'> = {
        parcel: 'shipment',
        shopping: 'delivery',
        food: 'delivery',
      };
      const req = await createRequest({
        type: typeMap[service],
        from_city: pickupCity,
        to_city: dropoffCity,
        from_address: pickupAddress || (pickupLatLng ? `${pickupLatLng.lat.toFixed(5)}, ${pickupLatLng.lng.toFixed(5)}` : ''),
        to_address: dropoffAddress || (dropoffLatLng ? `${dropoffLatLng.lat.toFixed(5)}, ${dropoffLatLng.lng.toFixed(5)}` : ''),
        description: `[${SERVICE_TYPES.find(s => s.id === service)?.label}] ${description}`,
        notes: [
          notes,
          `الحجم: ${SIZE_OPTIONS.find(s => s.id === packageSize)?.label}`,
          senderName ? `المُرسِل: ${senderName} - ${senderPhone}` : '',
          receiverName ? `المستلم: ${receiverName} - ${receiverPhone}` : '',
          estimatedPrice ? `السعر التقديري: ${estimatedPrice.toLocaleString('ar-YE')} ريال` : '',
          selectedPromo ? `العرض المطبّق: ${selectedPromo.title}` : '',
          `طريقة الدفع المفضّلة: ${paymentMethod === 'cash' ? 'عند الاستلام' : 'تحويل مصرفي'}`,
        ].filter(Boolean).join('\n'),
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
      } as any);

      // Send admin notification
      try {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: '✅ تم استقبال طلبك',
          body: `طلب ${SERVICE_TYPES.find(s => s.id === service)?.label} من ${pickupCity} إلى ${dropoffCity}`,
        } as any);

        await sendPushNotification({
          targetRole: 'admin',
          title: `🔔 طلب ${SERVICE_TYPES.find(s => s.id === service)?.label} جديد`,
          body: [
            `من ${pickupCity} إلى ${dropoffCity}`,
            estimatedPrice ? `السعر التقديري: ${estimatedPrice.toLocaleString('ar-YE')} ريال` : null,
            selectedPromo ? `العرض: ${selectedPromo.title}` : null,
          ].filter(Boolean).join(' • '),
          data: { type: 'service_request', requestId: (req as any)?.id },
          url: `/admin/join-requests`,
        });
      } catch (e) { console.error('Notification error:', e); }

      const requestId = (req as any)?.id;
      setCreatedId(requestId);

      // Redirect to payment if transfer selected
      if (paymentMethod === 'transfer' && requestId) {
        navigate(`/payment/delivery/${requestId}`);
      } else {
        setDone(true);
      }
    } catch (err: any) {
      toast({ title: 'حدث خطأ', description: err?.message || 'يرجى المحاولة مرة أخرى', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Done Screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">تم إرسال طلبك! 🎉</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            طلبك قيد المراجعة. سيصلك إشعار فور تحديد السعر من الشريك.
            <br /><span className="text-green-600 font-semibold">🔒 رقمك محجوب حتى توافق على السعر</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/history')}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-sm hover:bg-green-700 transition-colors"
            >
              تتبع الطلب
            </button>
            <button
              onClick={() => { setDone(false); setStep('pickup'); setDescription(''); setNotes(''); setPickupLatLng(null); setDropoffLatLng(null); }}
              className="w-full bg-gray-100 text-gray-600 rounded-xl py-3 font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              طلب جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cfg = SERVICE_TYPES.find(s => s.id === service)!;
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50 pb-8" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => stepIndex > 0 ? prevStep() : navigate(-1)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="flex-1 text-center font-black text-gray-900 text-lg">طلب توصيل</h1>
          <div className="w-9" />
        </div>

        {/* Service type tabs */}
        <div className="flex gap-2 mt-3 max-w-lg mx-auto overflow-x-auto pb-1 scrollbar-hide">
          {SERVICE_TYPES.map((s) => (
            <button
              key={s.id}
              onClick={() => setService(s.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                background: service === s.id ? s.color : '#F3F4F6',
                color: service === s.id ? '#fff' : '#6B7280',
              }}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mt-3 max-w-lg mx-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                  style={{
                    background: i < stepIndex ? cfg.color : i === stepIndex ? cfg.color : '#E5E7EB',
                    color: i <= stepIndex ? '#fff' : '#9CA3AF',
                  }}
                >
                  {i < stepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-[10px] font-semibold mt-0.5" style={{ color: i === stepIndex ? cfg.color : '#9CA3AF' }}>
                  {STEP_LABELS[s]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-0.5 flex-1 mb-4 mx-1 rounded-full transition-all" style={{ background: i < stepIndex ? cfg.color : '#E5E7EB' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Promotions strip */}
      {promotions.length > 0 && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-red-500" />
            <span className="text-sm font-black text-gray-800">عروض وخصومات</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide -mx-0">
            {promotions.map(promo => (
              <PromoCard
                key={promo.id}
                promo={promo}
                selected={selectedPromo?.id === promo.id}
                onSelect={() => setSelectedPromo(prev => prev?.id === promo.id ? null : promo)}
              />
            ))}
          </div>
          {selectedPromo && (
            <div
              className="mt-2 rounded-xl px-4 py-3 flex items-start gap-2 border"
              style={{ background: cfg.color + '10', borderColor: cfg.color + '30' }}
            >
              <Tag className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: cfg.color }}>{selectedPromo.title}</p>
                {selectedPromo.description && <p className="text-xs text-gray-500 mt-0.5">{selectedPromo.description}</p>}
              </div>
              <button onClick={() => setSelectedPromo(null)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── STEP 1: PICKUP ── */}
        {step === 'pickup' && (
          <>
            <SectionCard icon={<MapPin className="w-5 h-5" style={{ color: cfg.color }} />} title="📍 من أين؟">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">مدينة الاستلام <span className="text-red-500">*</span></label>
              <select
                value={pickupCity}
                onChange={e => setPickupCity(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
              >
                <option value="">اختر المدينة</option>
                {YEMENI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Map link paste */}
              <div className="mt-3 flex gap-2">
                <input
                  value={pickupLink}
                  onChange={e => setPickupLink(e.target.value)}
                  placeholder="الصق رابط الموقع من e Maps / Google Maps"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={applyPickupLink}
                  className="px-3 py-2.5 rounded-xl text-white text-xs font-bold flex-shrink-0"
                  style={{ background: cfg.color }}
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>

              {/* My location button */}
              <button
                onClick={() => getMyLocation('pickup')}
                className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Navigation className="w-4 h-4 text-blue-500" />
                موقعي الحالي
              </button>

              {/* Map */}
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                <LocationMap
                  center={pickupMapCenter}
                  marker={pickupLatLng}
                  onSelect={(ll) => { setPickupLatLng(ll); setPickupMapCenter(ll); }}
                />
              </div>
              {pickupLatLng && (
                <p className="text-xs text-gray-500 mt-1.5 text-center">
                  📍 {pickupLatLng.lat.toFixed(5)}, {pickupLatLng.lng.toFixed(5)}
                </p>
              )}
              {!pickupLatLng && (
                <p className="text-xs text-gray-400 mt-1.5 text-center">انقر على الخريطة لتحديد الموقع بدقة</p>
              )}

              {/* Detailed address */}
              <div className="mt-3">
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">العنوان التفصيلي (اختياري)</label>
                <input
                  value={pickupAddress}
                  onChange={e => setPickupAddress(e.target.value)}
                  placeholder="الحي / الشارع / المبنى / المعلم"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </SectionCard>

            {/* Sender info */}
            <SectionCard icon={<User className="w-5 h-5" style={{ color: cfg.color }} />} title="معلومات المُرسِل">
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={iAmSender}
                  onChange={e => setIAmSender(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="text-sm font-semibold text-gray-600">أنا المُرسِل</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">اسم المُرسِل</label>
                  <input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="الاسم الكامل"
                    disabled={iAmSender}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={senderPhone}
                    onChange={e => setSenderPhone(e.target.value)}
                    placeholder="07X XXXX XXX"
                    disabled={iAmSender}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
                  />
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ── STEP 2: DROPOFF ── */}
        {step === 'dropoff' && (
          <>
            <SectionCard icon={<MapPin className="w-5 h-5" style={{ color: cfg.color }} />} title="📍 إلى أين؟">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">مدينة التسليم <span className="text-red-500">*</span></label>
              <select
                value={dropoffCity}
                onChange={e => setDropoffCity(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none"
              >
                <option value="">اختر المدينة</option>
                {YEMENI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Map link paste */}
              <div className="mt-3 flex gap-2">
                <input
                  value={dropoffLink}
                  onChange={e => setDropoffLink(e.target.value)}
                  placeholder="الصق رابط الموقع من e Maps / Google Maps"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={applyDropoffLink}
                  className="px-3 py-2.5 rounded-xl text-white text-xs font-bold flex-shrink-0"
                  style={{ background: cfg.color }}
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>

              {/* My location button */}
              <button
                onClick={() => getMyLocation('dropoff')}
                className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Navigation className="w-4 h-4 text-blue-500" />
                موقعي الحالي
              </button>

              {/* Map */}
              <div className="mt-3 rounded-xl overflow-hidden border border-gray-200">
                <LocationMap
                  center={dropoffMapCenter}
                  marker={dropoffLatLng}
                  onSelect={(ll) => { setDropoffLatLng(ll); setDropoffMapCenter(ll); }}
                />
              </div>
              {dropoffLatLng && (
                <p className="text-xs text-gray-500 mt-1.5 text-center">
                  📍 {dropoffLatLng.lat.toFixed(5)}, {dropoffLatLng.lng.toFixed(5)}
                </p>
              )}
              {!dropoffLatLng && (
                <p className="text-xs text-gray-400 mt-1.5 text-center">انقر على الخريطة لتحديد الموقع بدقة</p>
              )}

              {/* Detailed address */}
              <div className="mt-3">
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">العنوان التفصيلي (اختياري)</label>
                <input
                  value={dropoffAddress}
                  onChange={e => setDropoffAddress(e.target.value)}
                  placeholder="مثال: سيئون، شارع المطار"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Distance badge */}
              {distance != null && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-blue-700 font-semibold">المسافة التقديرية: {distance.toFixed(1)} كم</span>
                </div>
              )}
            </SectionCard>

            {/* Receiver info */}
            <SectionCard icon={<User className="w-5 h-5" style={{ color: cfg.color }} />} title="معلومات المستلم">
              <p className="text-xs text-gray-400 mb-3">🔒 رقم المستلم مخفي عن المندوب حتى إتمام الصفقة</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">اسم المستلم</label>
                  <input
                    value={receiverName}
                    onChange={e => setReceiverName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={receiverPhone}
                    onChange={e => setReceiverPhone(e.target.value)}
                    placeholder="07X XXXX XXX"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ── STEP 3: DETAILS ── */}
        {step === 'details' && (
          <SectionCard icon={<FileText className="w-5 h-5" style={{ color: cfg.color }} />} title="📦 تفاصيل الطلب">
            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                {service === 'parcel' ? 'محتوى الطرد' : service === 'shopping' ? 'ما الذي تريد شراءه؟' : 'ما الذي تريد طلبه؟'}
                <span className="text-red-500"> *</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder={
                  service === 'parcel'
                    ? 'مثال: شاشة كمبيوتر، ملابس، مستندات...'
                    : service === 'shopping'
                    ? 'مثال: مشتريات من محل الجمعية'
                    : 'مثال: وجبة عشاء من مطعم الشاطئ'
                }
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Package size (parcel only) */}
            {service === 'parcel' && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-600 mb-2">الحجم</label>
                <div className="grid grid-cols-3 gap-2">
                  {SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPackageSize(opt.id)}
                      className="p-3 rounded-xl border-2 transition-all text-center"
                      style={{
                        borderColor: packageSize === opt.id ? cfg.color : '#E5E7EB',
                        background: packageSize === opt.id ? cfg.color + '10' : '#F9FAFB',
                      }}
                    >
                      <div className="font-bold text-sm" style={{ color: packageSize === opt.id ? cfg.color : '#374151' }}>{opt.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">ملاحظات إضافية (اختياري)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="أي تعليمات إضافية للمندوب..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1.5">📷 صورة الطرد (اختياري)</label>
              <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-green-400 transition-colors">
                <ImageIcon className="w-6 h-6 text-gray-400" />
                <span className="text-sm text-gray-500">اضغط لرفع صورة</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt="preview" className="mt-2 rounded-xl w-full h-36 object-cover border border-gray-200" />
              )}
            </div>
          </SectionCard>
        )}

        {/* ── STEP 4: REVIEW ── */}
        {step === 'review' && (
          <>
            {/* Price card */}
            {estimatedPrice != null ? (
              <div
                className="rounded-2xl p-5 text-white"
                style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}dd)` }}
              >
                <div className="flex items-center gap-2 mb-3 opacity-90">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-bold">السعر التقديري</span>
                </div>
                <div className="text-4xl font-black mb-1">{estimatedPrice.toLocaleString('ar-YE')} <span className="text-xl opacity-80">ريال</span></div>
                <div className="flex items-center gap-4 mt-3 opacity-80 text-sm">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {distance!.toFixed(1)} كم
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {estimatedTime} - {estimatedTime! + 15} دقيقة
                  </div>
                </div>
                <p className="text-xs mt-2 opacity-70">* السعر تقديري وقد يتغير حسب الشريك</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-700 text-sm">لم يتم تحديد الموقع على الخريطة</p>
                  <p className="text-amber-600 text-xs mt-0.5">سيتم إرسال الطلب وسيتواصل معك الشريك لتحديد السعر</p>
                </div>
              </div>
            )}

            {/* Summary */}
            <SectionCard icon={<FileText className="w-5 h-5" style={{ color: cfg.color }} />} title="ملخص الطلب">
              <SummaryRow label="نوع الخدمة" value={cfg.label} />
              <SummaryRow label="من" value={`${pickupCity}${pickupAddress ? ' • ' + pickupAddress : ''}`} />
              <SummaryRow label="إلى" value={`${dropoffCity}${dropoffAddress ? ' • ' + dropoffAddress : ''}`} />
              <SummaryRow label="التفاصيل" value={description} />
              {service === 'parcel' && <SummaryRow label="الحجم" value={SIZE_OPTIONS.find(s => s.id === packageSize)?.label || ''} />}
              {notes && <SummaryRow label="ملاحظات" value={notes} />}
              {senderName && <SummaryRow label="المُرسِل" value={`${senderName} ${senderPhone ? '• ' + senderPhone : ''}`} />}
              {receiverName && <SummaryRow label="المستلم" value={`${receiverName} ${receiverPhone ? '• ' + receiverPhone : ''}`} />}
            </SectionCard>

            {/* Payment method */}
            <SectionCard icon={<CreditCard className="w-5 h-5" style={{ color: cfg.color }} />} title="طريقة الدفع">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all"
                  style={{
                    borderColor: paymentMethod === 'cash' ? cfg.color : '#E5E7EB',
                    background: paymentMethod === 'cash' ? cfg.color + '10' : '#F9FAFB',
                  }}
                >
                  <Banknote className="w-6 h-6" style={{ color: paymentMethod === 'cash' ? cfg.color : '#9CA3AF' }} />
                  <span className="font-bold text-sm" style={{ color: paymentMethod === 'cash' ? cfg.color : '#374151' }}>عند الاستلام</span>
                  <span className="text-xs text-gray-400">ادفع نقداً للمندوب</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all"
                  style={{
                    borderColor: paymentMethod === 'transfer' ? cfg.color : '#E5E7EB',
                    background: paymentMethod === 'transfer' ? cfg.color + '10' : '#F9FAFB',
                  }}
                >
                  <CreditCard className="w-6 h-6" style={{ color: paymentMethod === 'transfer' ? cfg.color : '#9CA3AF' }} />
                  <span className="font-bold text-sm" style={{ color: paymentMethod === 'transfer' ? cfg.color : '#374151' }}>تحويل مصرفي</span>
                  <span className="text-xs text-gray-400">ادفع مسبقاً عبر البنك</span>
                </button>
              </div>
              <div className="mt-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <span className="text-green-600 text-sm">🔒</span>
                <p className="text-xs text-green-700">رقمك محجوب تماماً حتى توافق على السعر واختيار طريقة الدفع</p>
              </div>
            </SectionCard>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-3 transition-all shadow-lg"
              style={{
                background: submitting ? '#9CA3AF' : `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
                boxShadow: submitting ? 'none' : `0 8px 32px ${cfg.color}40`,
              }}
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> جاري الإرسال...</>
              ) : (
                <>اطلب الآن <ArrowLeft className="w-5 h-5" /></>
              )}
            </button>
          </>
        )}

        {/* Next button (steps 1-3) */}
        {step !== 'review' && (
          <button
            onClick={nextStep}
            disabled={!canGoNext()}
            className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-3 transition-all"
            style={{
              background: canGoNext() ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` : '#E5E7EB',
              color: canGoNext() ? '#fff' : '#9CA3AF',
              boxShadow: canGoNext() ? `0 6px 24px ${cfg.color}30` : 'none',
            }}
          >
            التالي <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Promo type metadata ──────────────────────────────────────────────────────
const PROMO_META: Record<PromoType, { label: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  free_delivery_min_order: { label: 'توصيل مجاني', icon: Truck, color: '#2563EB', bg: '#EFF6FF' },
  free_delivery_schedule: { label: 'توصيل مجاني', icon: Calendar, color: '#2563EB', bg: '#EFF6FF' },
  free_delivery_limited: { label: 'عرض محدود', icon: AlarmClock, color: '#7C3AED', bg: '#F5F3FF' },
  discount_percent: { label: 'خصم', icon: Percent, color: '#DC2626', bg: '#FEF2F2' },
  fixed_discount: { label: 'خصم ثابت', icon: BadgeDollarSign, color: '#DC2626', bg: '#FEF2F2' },
  buy_x_get_y: { label: 'كومبو', icon: Gift, color: '#7C3AED', bg: '#F5F3FF' },
  custom_text: { label: 'عرض خاص', icon: Tag, color: '#0A7C4E', bg: '#F0FDF4' },
};

function PromoCard({ promo, selected, onSelect }: { promo: RestaurantPromotion; selected: boolean; onSelect: () => void }) {
  const meta = PROMO_META[promo.promo_type] || PROMO_META.custom_text;
  const Icon = meta.icon;
  return (
    <button
      onClick={onSelect}
      className="flex-shrink-0 rounded-2xl border-2 overflow-hidden transition-all duration-200 text-right"
      style={{
        width: 150,
        borderColor: selected ? meta.color : '#E5E7EB',
        background: selected ? meta.bg : '#fff',
        boxShadow: selected ? `0 4px 16px ${meta.color}30` : undefined,
      }}
    >
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: meta.color + '20' }}>
            <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: meta.color, color: '#fff' }}>
            {meta.label}
          </span>
        </div>
        <p className="font-black text-xs text-gray-800 leading-tight line-clamp-2">{promo.title}</p>
        {promo.description && (
          <p className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-2">{promo.description}</p>
        )}
        {promo.discount_percent && (
          <p className="text-sm font-black mt-1" style={{ color: meta.color }}>خصم {promo.discount_percent}%</p>
        )}
        {promo.discount_amount && (
          <p className="text-sm font-black mt-1" style={{ color: meta.color }}>{promo.discount_amount.toLocaleString('ar-YE')} ر.ي</p>
        )}
        {promo.min_order_amount && (
          <p className="text-[10px] text-gray-400 mt-0.5">عند الطلب فوق {promo.min_order_amount.toLocaleString('ar-YE')}</p>
        )}
      </div>
    </button>
  );
}

// ── Helper components ────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-black text-gray-800 text-base">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 font-medium flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-700 font-semibold text-left mr-2 leading-relaxed">{value}</span>
    </div>
  );
}
