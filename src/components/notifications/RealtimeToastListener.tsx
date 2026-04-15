import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Package, Bike, DollarSign } from "lucide-react";

/**
 * Global realtime toast listener — renders nothing,
 * subscribes to DB changes and shows interactive toasts.
 * Only uses FILTERED subscriptions to avoid processing every row in the DB.
 */
const RealtimeToastListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    // Clean up any previous channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`user-toasts-${user.id}`)
      // ── New notifications (filtered by user) ──
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as any;
          const navUrl = n.data?.url || "/notifications";
          toast(n.title, {
            description: n.body || undefined,
            icon: <Bell className="w-4 h-4 text-primary" />,
            action: { label: "عرض", onClick: () => navigate(navUrl) },
            duration: 6000,
          });
        }
      )
      // ── Shipment status (filtered by customer) ──
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shipment_requests", filter: `customer_id=eq.${user.id}` },
        (payload) => {
          const s = payload.new as any;
          const old = payload.old as any;
          if (s.status === old?.status) return;
          const statusMessages: Record<string, string> = {
            accepted: "تم قبول طلب الشحن ✅",
            priced: "تم تسعير طردك 💰",
            picked_up: "تم استلام طردك 📦",
            on_the_way: "طردك في الطريق 🚚",
            delivered: "تم توصيل طردك بنجاح ✅",
            cancelled: "تم إلغاء طلب الطرد ❌",
          };
          const msg = statusMessages[s.status];
          if (msg) {
            toast(msg, {
              icon: <Package className="w-4 h-4 text-primary" />,
              action: { label: "عرض التفاصيل", onClick: () => navigate(`/order/shipment/${s.id}`) },
              duration: 6000,
            });
          }
          // Also handle price offer in same event
          if (s.negotiation_status === "offered" && old?.negotiation_status !== "offered") {
            toast("عرض سعر جديد! 💰", {
              description: `السعر المقترح: ${Number(s.proposed_price).toLocaleString()} ر.ي`,
              icon: <DollarSign className="w-4 h-4 text-amber-500" />,
              action: { label: "عرض والقبول", onClick: () => navigate(`/order/shipment/${s.id}`) },
              duration: 10000,
            });
          }
        }
      )
      // ── Delivery order status (filtered by customer) ──
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_orders", filter: `customer_id=eq.${user.id}` },
        (payload) => {
          const d = payload.new as any;
          const old = payload.old as any;
          if (d.status === old?.status) return;
          const statusMessages: Record<string, string> = {
            accepted: "تم قبول طلب التوصيل ✅",
            preparing: "جاري تحضير طلبك 🍳",
            assigned: "تم تعيين سائق لطلبك 🏍️",
            picked_up: "تم استلام طلبك 📦",
            on_the_way: "طلبك في الطريق 🚀",
            delivered: "تم توصيل طلبك بنجاح ✅",
            cancelled: "تم إلغاء طلب التوصيل ❌",
          };
          const msg = statusMessages[d.status];
          if (msg) {
            toast(msg, {
              icon: <Bike className="w-4 h-4 text-primary" />,
              action: { label: "تتبع الطلب", onClick: () => navigate(`/order/delivery/${d.id}`) },
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user.id, not the full user object or navigate

  return null;
};

export default RealtimeToastListener;
