const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const formatTime12 = (t: string) => {
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

export const getOpenStatus = (hours: any): OpenStatus => {
  if (!hours || typeof hours !== "object") return { isOpen: true, subtext: "مفتوح" };
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
