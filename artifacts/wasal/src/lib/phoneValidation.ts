// Yemeni phone number validation
// Valid prefixes: 70, 71, 73, 77, 78
const YEMEN_PHONE_REGEX = /^(70|71|73|77|78)\d{7}$/;

export const isValidYemeniPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\s|-/g, "");
  return YEMEN_PHONE_REGEX.test(cleaned);
};

export const formatYemeniPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "").slice(0, 9);
  return cleaned;
};

export const getPhoneError = (phone: string): string | null => {
  if (!phone) return null;
  const cleaned = phone.replace(/\s|-/g, "");
  if (cleaned.length < 9) return "الرقم يجب أن يكون 9 أرقام";
  if (cleaned.length > 9) return "الرقم طويل جداً";
  if (!YEMEN_PHONE_REGEX.test(cleaned)) return "رقم يمني غير صالح (يبدأ بـ 70, 71, 73, 77, 78)";
  return null;
};
