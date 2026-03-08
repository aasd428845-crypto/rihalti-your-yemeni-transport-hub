import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, MapPin, User, FileText, ArrowLeft, Send, MessageCircle, CheckCircle, Truck, Car } from 'lucide-react';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { YEMENI_CITIES } from '@/lib/contactFilter';
import { useAuth } from '@/contexts/AuthContext';

type RequestType = 'shipment' | 'delivery' | 'taxi';

const typeConfig = {
  shipment: { label: 'إرسال شحنة', icon: Package, color: '#0A7C4E', desc: 'أرسل بضاعتك بين المدن' },
  delivery: { label: 'طلب توصيل', icon: Truck, color: '#2563EB', desc: 'توصيل محلي سريع' },
  taxi: { label: 'سيارة أجرة', icon: Car, color: '#D97706', desc: 'انتقل بين المدن والمناطق' },
};

export default function ShipmentRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createRequest } = useServiceRequests();
  const [step, setStep] = useState<'type' | 'form' | 'sent'>('type');
  const [selectedType, setSelectedType] = useState<RequestType>('shipment');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    from_city: '', to_city: '', from_address: '', to_address: '',
    description: '', quantity: '1', notes: '', receiver_name: '', receiver_phone: '',
  });

  const config = typeConfig[selectedType];

  const handleSubmit = async () => {
    if (!form.from_city || !form.to_city) {
      alert('يرجى تحديد مدينة الإرسال والاستلام');
      return;
    }
    if (selectedType === 'shipment' && !form.description) {
      alert('يرجى وصف محتوى الشحنة');
      return;
    }
    setLoading(true);
    try {
      await createRequest({
        type: selectedType,
        from_city: form.from_city, to_city: form.to_city,
        from_address: form.from_address, to_address: form.to_address,
        description: form.description, quantity: parseInt(form.quantity) || 1,
        notes: form.notes, receiver_name: form.receiver_name, receiver_phone: form.receiver_phone,
      });
      setStep('sent');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'type') {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1B2A', padding: '80px 24px', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#8BA8A0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '32px', fontSize: '14px' }}>
            <ArrowLeft size={16} /> رجوع
          </button>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>ماذا تريد؟</h1>
          <p style={{ color: '#8BA8A0', marginBottom: '40px', fontSize: '15px' }}>اختر نوع الخدمة المطلوبة</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(Object.entries(typeConfig) as [RequestType, typeof typeConfig.shipment][]).map(([type, cfg]) => (
              <div key={type}
                onClick={() => { setSelectedType(type); setStep('form'); }}
                style={{
                  background: 'rgba(22,34,52,0.8)', borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '24px 28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px',
                  transition: 'all 0.2s',
                }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: cfg.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <cfg.icon size={26} color={cfg.color} />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: '700', fontSize: '18px' }}>{cfg.label}</div>
                  <div style={{ color: '#8BA8A0', fontSize: '13px', marginTop: '4px' }}>{cfg.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '32px', background: 'rgba(245,158,11,0.08)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <MessageCircle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ color: '#F59E0B', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>كيف يعمل النظام؟</div>
              <div style={{ color: '#8BA8A0', fontSize: '13px', lineHeight: '1.7' }}>
                ١. تملأ بطاقة الطلب وترسله<br />٢. يصلك سعر من الشريك<br />٣. توافق وتختار طريقة الدفع<br />٤. يُكشف رقم التواصل بعد الموافقة فقط 🔒
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div style={{ minHeight: '100vh', background: '#0D1B2A', padding: '80px 24px', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <button onClick={() => setStep('type')} style={{ background: 'none', border: 'none', color: '#8BA8A0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', fontSize: '14px' }}>
            <ArrowLeft size={16} /> رجوع
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: config.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <config.icon size={24} color={config.color} />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: 0 }}>{config.label}</h1>
              <p style={{ color: '#8BA8A0', fontSize: '13px', margin: '2px 0 0' }}>🔒 رقمك محجوب حتى إتمام الصفقة</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* المدن */}
            <div style={{ background: 'rgba(22,34,52,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px' }}>
              <h3 style={{ color: '#fff', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color={config.color} /> من أين إلى أين؟
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>مدينة الإرسال *</label>
                  <select value={form.from_city} onChange={e => setForm(f => ({ ...f, from_city: e.target.value }))}
                    style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none' }}>
                    <option value="">اختر المدينة</option>
                    {YEMENI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>مدينة الاستلام *</label>
                  <select value={form.to_city} onChange={e => setForm(f => ({ ...f, to_city: e.target.value }))}
                    style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none' }}>
                    <option value="">اختر المدينة</option>
                    {YEMENI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {(selectedType === 'delivery' || selectedType === 'taxi') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>العنوان التفصيلي (اختياري)</label>
                    <input value={form.from_address} onChange={e => setForm(f => ({ ...f, from_address: e.target.value }))} placeholder="الحي / المنطقة / المعلم"
                      style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>عنوان التسليم (اختياري)</label>
                    <input value={form.to_address} onChange={e => setForm(f => ({ ...f, to_address: e.target.value }))} placeholder="الحي / المنطقة / المعلم"
                      style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}
            </div>

            {/* تفاصيل */}
            <div style={{ background: 'rgba(22,34,52,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px' }}>
              <h3 style={{ color: '#fff', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color={config.color} /> تفاصيل {config.label}
              </h3>
              {selectedType === 'shipment' && (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>محتوى الشحنة *</label>
                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="مثال: شاشة كمبيوتر، ملابس..."
                      style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>العدد / الكمية</label>
                    <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      style={{ width: '120px', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none' }} />
                  </div>
                </>
              )}
              {selectedType === 'delivery' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>تفاصيل الطلب *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="مثال: وجبة عشاء من مطعم الشاطئ" rows={3}
                    style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                </div>
              )}
              {selectedType === 'taxi' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>تفاصيل الرحلة</label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {['ذهاب فقط', 'ذهاب وإياب', 'ذهاب وإياب مع انتظار'].map(opt => (
                      <button key={opt} onClick={() => setForm(f => ({ ...f, description: opt }))}
                        style={{
                          padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                          background: form.description === opt ? config.color : 'rgba(255,255,255,0.06)',
                          color: form.description === opt ? '#fff' : '#8BA8A0',
                        }}>{opt}</button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>ملاحظات إضافية (اختياري)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي تعليمات إضافية..." rows={2}
                  style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* بيانات المستلم */}
            {selectedType === 'shipment' && (
              <div style={{ background: 'rgba(22,34,52,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', padding: '24px' }}>
                <h3 style={{ color: '#fff', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color={config.color} /> بيانات المستلم
                </h3>
                <p style={{ color: '#8BA8A0', fontSize: '12px', marginBottom: '16px' }}>🔒 رقم المستلم مخفي عن الشريك حتى إتمام الصفقة</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>اسم المستلم</label>
                    <input value={form.receiver_name} onChange={e => setForm(f => ({ ...f, receiver_name: e.target.value }))} placeholder="اسم الشخص المستلم"
                      style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ color: '#8BA8A0', fontSize: '13px', display: 'block', marginBottom: '6px' }}>رقم هاتف المستلم</label>
                    <input type="tel" value={form.receiver_phone} onChange={e => setForm(f => ({ ...f, receiver_phone: e.target.value }))} placeholder="07X XXXX XXX"
                      style={{ width: '100%', background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', padding: '12px 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>
            )}

            {/* إشعار الخصوصية */}
            <div style={{ background: 'rgba(30,201,125,0.06)', borderRadius: '12px', border: '1px solid rgba(30,201,125,0.15)', padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>🔒</span>
              <div style={{ color: '#8BA8A0', fontSize: '13px', lineHeight: '1.7' }}>
                <strong style={{ color: '#1EC97D' }}>حماية بياناتك:</strong> رقمك محجوب تماماً عن الشريك. سيتم كشف معلومات التواصل فقط بعد موافقتك على السعر واختيار طريقة الدفع.
              </div>
            </div>

            <button onClick={handleSubmit} disabled={loading}
              style={{
                background: loading ? '#666' : `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
                color: '#fff', border: 'none', borderRadius: '14px', padding: '18px',
                fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: loading ? 'none' : `0 6px 24px ${config.color}40`,
              }}>
              {loading ? '⏳ جاري الإرسال...' : <><Send size={18} /> أرسل الطلب</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // شاشة التأكيد
  return (
    <div style={{ minHeight: '100vh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'rgba(30,201,125,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={40} color="#1EC97D" />
        </div>
        <h2 style={{ color: '#fff', fontSize: '26px', fontWeight: '800', marginBottom: '12px' }}>تم إرسال طلبك! ✅</h2>
        <p style={{ color: '#8BA8A0', fontSize: '15px', lineHeight: '1.8', marginBottom: '32px' }}>
          طلبك قيد المراجعة. سيصلك إشعار فور تحديد السعر من الشريك.<br /><br />🔒 رقمك محجوب حتى توافق على السعر
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={() => navigate('/history')}
            style={{ background: 'linear-gradient(135deg, #0A7C4E, #12A868)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            تتبع طلبي
          </button>
          <button onClick={() => { setStep('type'); setForm({ from_city: '', to_city: '', from_address: '', to_address: '', description: '', quantity: '1', notes: '', receiver_name: '', receiver_phone: '' }); }}
            style={{ background: 'transparent', color: '#8BA8A0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px', fontSize: '15px', cursor: 'pointer' }}>
            إرسال طلب جديد
          </button>
        </div>
      </div>
    </div>
  );
}
