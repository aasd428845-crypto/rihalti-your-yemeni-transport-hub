const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const formatTime12 = (t: string) => {
  if (!t) return "";
  const [hStr, m] = t.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return t;
  const period = h >= 12 ? "م" : "ص";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m || "00"} ${period}`;
};

export interface OpenStatus {
  isOpen: boolean;
  subtext: string;
}

/**
 * Supports both schemas:
 * - New DB: opening_time/closing_time (simple strings "09:00")
 * - Old DB: opening_hours JSONB { saturday: { open: true, from: "09:00", to: "23:00" }, ... }
 */
export const getOpenStatus = (restaurant: any): OpenStatus => {
  const hours = restaurant?.opening_hours;
  const openingTime = restaurant?.opening_time;
  const closingTime = restaurant?.closing_time;

  // New DB schema: simple opening_time / closing_time strings
  if (!hours && (openingTime || closingTime)) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const parseMin = (t: string) => {
      const [h, m] = (t || "").split(":").map(Number);
      return isNaN(h) ? null : h * 60 + (m || 0);
    };
    const fromMin = parseMin(openingTime);
    const toMin = parseMin(closingTime);
    if (fromMin === null && toMin === null) return { isOpen: true, subtext: "مفتوح" };
    const open = fromMin === null || toMin === null
      ? true
      : (toMin > fromMin ? nowMin >= fromMin && nowMin < toMin : nowMin >= fromMin || nowMin < toMin);
    if (open) return { isOpen: true, subtext: closingTime ? `مفتوح حتى ${formatTime12(closingTime)}` : "مفتوح" };
    return { isOpen: false, subtext: openingTime ? `يفتح ${formatTime12(openingTime)}` : "مغلق" };
  }

  // Old DB schema: opening_hours JSONB
  if (!hours || typeof hours !== "object" || Object.keys(hours).length === 0) {
    return { isOpen: true, subtext: "مفتوح" };
  }
  const now = new Date();
  const todayKey = DAY_KEYS[now.getDay()];
  const today = hours[todayKey];
  if (!today || today.open === false) {
    for (let i = 1; i <= 7; i++) {
      const next = hours[DAY_KEYS[(now.getDay() + i) % 7]];
      if (next && next.open !== false && next.from) {
        const dayLabels: Record<string, string> = {
          sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء",
          thursday: "الخميس", friday: "الجمعة", saturday: "السبت",
        };
        const dayName = dayLabels[DAY_KEYS[(now.getDay() + i) % 7]];
        return { isOpen: false, subtext: `يفتح ${i === 1 ? "غداً" : dayName} ${formatTime12(next.from)}` };
      }
    }
    return { isOpen: false, subtext: "مغلق" };
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [fH, fM] = (today.from || "00:00").split(":").map(Number);
  const [tH, tM] = (today.to || "23:59").split(":").map(Number);
  const fromMin = fH * 60 + (fM || 0);
  const toMin = tH * 60 + (tM || 0);
  if (nowMin >= fromMin && nowMin < toMin) {
    return { isOpen: true, subtext: `مفتوح حتى ${formatTime12(today.to)}` };
  }
  if (nowMin < fromMin) {
    return { isOpen: false, subtext: `يفتح ${formatTime12(today.from)}` };
  }
  return { isOpen: false, subtext: "مغلق الآن" };
};
