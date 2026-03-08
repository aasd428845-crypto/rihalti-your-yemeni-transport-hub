import { CheckCircle, X } from 'lucide-react';
import { useState } from 'react';
import { ServiceRequest } from '@/types/serviceRequest.types';
import { useServiceRequests } from '@/hooks/useServiceRequests';

interface Props {
  request: ServiceRequest;
  onClose?: () => void;
}

export function PriceOfferCard({ request, onClose }: Props) {
  const { approvePrice, rejectPrice } = useServiceRequests();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | ''>('');
  const [step, setStep] = useState<'offer' | 'payment' | 'done'>('offer');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!paymentMethod) return;
    setLoading(true);
    try {
      await approvePrice(request.id, paymentMethod);
      setStep('done');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(22,34,52,0.98)', borderRadius: '20px',
      border: '1px solid rgba(30,201,125,0.2)', padding: '28px 24px',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
    }}>
      {step === 'offer' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <span style={{ fontSize: '24px' }}>💰</span>
            <h3 style={{ color: '#fff', fontWeight: '700', fontSize: '18px', margin: 0 }}>وصلك عرض سعر!</h3>
          </div>
          <div style={{ background: 'rgba(13,27,42,0.8)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#8BA8A0', fontSize: '13px' }}>نوع الطلب</span>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>
                {request.type === 'shipment' ? '📦 شحنة' : request.type === 'delivery' ? '🛵 توصيل' : '🚗 سيارة أجرة'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#8BA8A0', fontSize: '13px' }}>المسار</span>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600' }}>{request.from_city} ← {request.to_city}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#8BA8A0', fontSize: '14px' }}>السعر المقترح</span>
              <span style={{ color: '#1EC97D', fontSize: '28px', fontWeight: '900' }}>
                {request.proposed_price?.toLocaleString('ar-YE')} <span style={{ fontSize: '14px', color: '#8BA8A0' }}>ريال</span>
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={() => setStep('payment')}
              style={{ background: 'linear-gradient(135deg, #0A7C4E, #12A868)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <CheckCircle size={16} /> أوافق
            </button>
            <button onClick={() => rejectPrice(request.id)}
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <X size={16} /> أرفض
            </button>
          </div>
        </>
      )}

      {step === 'payment' && (
        <>
          <h3 style={{ color: '#fff', fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>اختر طريقة الدفع</h3>
          <p style={{ color: '#8BA8A0', fontSize: '13px', marginBottom: '20px' }}>بعد الاختيار سيُكشف رقم التواصل للشريك 🔓</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {[
              { value: 'cash' as const, label: 'نقداً عند التسليم', icon: '💵', desc: 'تدفع للشريك مباشرة عند الاستلام' },
              { value: 'bank_transfer' as const, label: 'تحويل بنكي', icon: '🏦', desc: 'تحويل للبنك العقبي / البندول / الكريمي' },
            ].map(opt => (
              <div key={opt.value} onClick={() => setPaymentMethod(opt.value)}
                style={{
                  background: paymentMethod === opt.value ? 'rgba(10,124,78,0.15)' : 'rgba(13,27,42,0.8)',
                  border: `1px solid ${paymentMethod === opt.value ? 'rgba(30,201,125,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '12px', padding: '16px', cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'center',
                }}>
                <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                <div>
                  <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{opt.label}</div>
                  <div style={{ color: '#8BA8A0', fontSize: '12px', marginTop: '2px' }}>{opt.desc}</div>
                </div>
                {paymentMethod === opt.value && <CheckCircle size={20} color="#1EC97D" style={{ marginRight: 'auto' }} />}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={handleApprove} disabled={!paymentMethod || loading}
              style={{ background: paymentMethod ? 'linear-gradient(135deg, #0A7C4E, #12A868)' : '#333', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: paymentMethod ? 'pointer' : 'not-allowed' }}>
              {loading ? '...' : 'تأكيد ✅'}
            </button>
            <button onClick={() => setStep('offer')}
              style={{ background: 'transparent', color: '#8BA8A0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', fontSize: '14px', cursor: 'pointer' }}>
              رجوع
            </button>
          </div>
        </>
      )}

      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h3 style={{ color: '#fff', fontWeight: '800', fontSize: '20px', marginBottom: '8px' }}>تمت الموافقة!</h3>
          <p style={{ color: '#8BA8A0', fontSize: '14px', lineHeight: '1.8' }}>
            تم كشف رقم تواصلك للشريك.<br />سيتواصل معك قريباً لتنفيذ الطلب.
          </p>
        </div>
      )}
    </div>
  );
}
