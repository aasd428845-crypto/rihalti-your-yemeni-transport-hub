import { getPartnerSubscriptionStatus } from "@/lib/subscriptionApi";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const SubscriptionBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    if (user) getPartnerSubscriptionStatus(user.id).then(setStatus);
  }, [user]);

  if (!status) return null;

  if (status.isExpired) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-bold text-red-700">⚠️ انتهت صلاحية اشتراكك. بعض الميزات معطّلة حالياً.</span>
        <button
          onClick={() => navigate("/delivery/subscription")}
          className="text-sm font-bold text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
        >
          تجديد الاشتراك
        </button>
      </div>
    );
  }

  if (status.isExpiringSoon) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-bold text-amber-700">⏰ اشتراكك ({status.plan?.name_ar}) ينتهي قريباً.</span>
        <button
          onClick={() => navigate("/delivery/subscription")}
          className="text-sm font-bold text-white bg-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
        >
          تجديد الآن
        </button>
      </div>
    );
  }

  if (status.orderLimitReached) {
    return (
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-bold text-orange-700">
          📦 وصلتَ للحد الأقصى من الطلبات هذا الشهر ({status.ordersUsedThisMonth}/{status.plan?.max_orders_per_month}).
        </span>
        <button
          onClick={() => navigate("/delivery/subscription")}
          className="text-sm font-bold text-white bg-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors"
        >
          ترقية الخطة
        </button>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;
