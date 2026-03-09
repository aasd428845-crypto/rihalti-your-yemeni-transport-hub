import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, MessageSquare, Package, Bike, DollarSign, CheckCircle } from "lucide-react";

/**
 * Global realtime toast listener — renders nothing, 
 * subscribes to DB changes and shows interactive toasts.
 */
const RealtimeToastListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-toasts")
      // New notifications
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as any;
          const navUrl = n.data?.url || "/notifications";
          toast(n.title, {
            description: n.body || undefined,
            icon: <Bell className="w-4 h-4 text-primary" />,
            action: {
              label: "عرض",
              onClick: () => navigate(navUrl),
            },
            duration: 6000,
          });
        }
      )
      // New order messages
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_messages" },
        (payload) => {
          const msg = payload.new as any;
          // Don't toast own messages
          if (msg.sender_id === user.id) return;
          toast("رسالة جديدة 💬", {
            description: msg.message?.slice(0, 60) || "لديك رسالة جديدة",
            icon: <MessageSquare className="w-4 h-4 text-primary" />,
            action: {
              label: "فتح المحادثة",
              onClick: () => navigate(`/order/${msg.order_type}/${msg.order_id}`),
            },
            duration: 8000,
          });
        }
      )
      // Shipment status changes
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
            rejected: "تم رفض طلب الطرد",
          };

          const msg = statusMessages[s.status];
          if (msg) {
            toast(msg, {
              icon: <Package className="w-4 h-4 text-primary" />,
              action: {
                label: "عرض التفاصيل",
                onClick: () => navigate(`/order/shipment/${s.id}`),
              },
              duration: 6000,
            });
          }
        }
      )
      // Delivery order status changes
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
              action: {
                label: "تتبع الطلب",
                onClick: () => navigate(`/order/delivery/${d.id}`),
              },
              duration: 6000,
            });
          }
        }
      )
      // Price offers (negotiation)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shipment_requests", filter: `customer_id=eq.${user.id}` },
        (payload) => {
          const s = payload.new as any;
          const old = payload.old as any;
          if (s.negotiation_status === "offered" && old?.negotiation_status !== "offered") {
            toast("عرض سعر جديد! 💰", {
              description: `السعر المقترح: ${Number(s.proposed_price).toLocaleString()} ر.ي`,
              icon: <DollarSign className="w-4 h-4 text-amber-500" />,
              action: {
                label: "عرض والقبول",
                onClick: () => navigate(`/order/shipment/${s.id}`),
              },
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  return null;
};

export default RealtimeToastListener;
