// فلتر الأرقام والمعلومات الشخصية في الدردشة

const PHONE_PATTERNS = [
  /\b(967|\+967|00967)\s*\d{7,9}\b/g,
  /\b07\d{8}\b/g,
  /\b\d{7,}\b/g,
  /wa\.me\/\S+/gi,
  /whatsapp\s*:\s*\S+/gi,
  /تواصل\s+معي\s+على/gi,
  /تواصل\s+معي\s+ع/gi,
  /اتصل\s+بي\s+على/gi,
  /رقمي\s+هو/gi,
  /رقم\s+هاتفي/gi,
];

export function containsContactInfo(message: string): boolean {
  return PHONE_PATTERNS.some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(message);
  });
}

export function maskPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 9) {
    return cleaned.slice(0, 3) + '****' + cleaned.slice(-2);
  }
  return '***-****';
}

export function maskReceiverPhone(phone: string): string {
  if (!phone) return '';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

export const BLOCKED_MESSAGE_TEXT = '🔒 هذه الرسالة محجوبة — لا يمكن مشاركة معلومات التواصل قبل إتمام الصفقة';
export const CONTACT_WARNING = 'لا يمكن مشاركة أرقام الهاتف أو معلومات التواصل في الدردشة قبل إتمام الصفقة';

export const YEMENI_CITIES = [
  'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'ذمار',
  'المكلا', 'سيئون', 'مأرب', 'حجة', 'صعدة', 'عمران',
  'البيضاء', 'شبوة', 'المهرة', 'سقطرى', 'لحج', 'أبين',
  'الضالع', 'ريمة', 'الجوف', 'المحويت', 'حضرموت',
  'الغرفة', 'تريم', 'شبام', 'عتق', 'زنجبار'
];
