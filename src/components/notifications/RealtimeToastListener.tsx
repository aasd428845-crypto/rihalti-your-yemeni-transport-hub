import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Package, Bike, DollarSign, ShoppingBag } from "lucide-react";
import {
  playNotificationSound,
  playNewOrderSound,
  playSuccessSound,
  playChatSound,
} from "@/lib/notificationSound";

/**
 * Global realtime toast listener — renders nothing.
 * Handles toasts + sounds for:
 *  - All users: new notifications table entries
 *  - Customer: shipment / delivery order status changes
 *  - Delivery company: new delivery orders (anywhere in dashboard)
 */
const RealtimeToastListener = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`user-toasts-${user.id}`);

    // ── 1. New notification record (all roles) ──────────────────
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      (payload) => {
        const n = payload.new as any;
        const navUrl = n.data?.url || "/notifications";
        const type = n.data?.type || "";

        // Choose sound by type
        if (type === "order_confirmed" || type === "payment_confirmed") {
          playSuccessSound();
        } else if (type === "chat" || type === "message") {
          playChatSound();
        } else if (type === "restaurant_order" || type === "new_order") {
          playNewOrderSound();
        } else {
          playNotificationSound();
        }

        toast(n.title, {
          description: n.body || undefined,
          icon: <Bell className="w-4 h-4 text-primary" />,
          action: { label: "عرض", onClick: () => navigate(navUrl) },
          duration: 8000,
        });
      }
    );

    // ── 2. Shipment status changes (customer) ───────────────────
    channel.on(
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
          playNotificationSound();
          toast(msg, {
            icon: <Package className="w-4 h-4 text-primary" />,
            action: { label: "عرض التفاصيل", onClick: () => navigate(`/order/shipment/${s.id}`) },
            duration: 8000,
          });
        }
        if (s.negotiation_status === "offered" && old?.negotiation_status !== "offered") {
          playNotificationSound();
          toast("عرض سعر جديد! 💰", {
            description: `السعر المقترح: ${Number(s.proposed_price).toLocaleString()} ر.ي`,
            icon: <DollarSign className="w-4 h-4 text-amber-500" />,
            action: { label: "عرض والقبول", onClick: () => navigate(`/order/shipment/${s.id}`) },
            duration: 12000,
          });
        }
      }
    );

    // ── 3. Delivery order status changes (customer) ─────────────
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "delivery_orders", filter: `customer_id=eq.${user.id}` },
      (payload) => {
        const d = payload.new as any;
        const old = payload.old as any;
        if (d.status === old?.status) return;
        const statusMessages: Record<string, string> = {
          confirmed: "تم تأكيد طلبك ✅",
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
          if (d.status === "delivered") {
            playSuccessSound();
          } else {
            playNotificationSound();
          }
          toast(msg, {
            icon: <Bike className="w-4 h-4 text-primary" />,
            action: { label: "تتبع الطلب", onClick: () => navigate(`/order/delivery/${d.id}`) },
            duration: 8000,
          });
        }
      }
    );

    // ── 4. New delivery order (delivery_company only) ───────────
    if (role === "delivery_company") {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_orders", filter: `delivery_company_id=eq.${user.id}` },
        (payload) => {
          const newOrder = payload.new as any;
          playNewOrderSound();
          toast("🍽️ طلب توصيل جديد!", {
            description: `${newOrder.customer_name || "عميل جديد"} — ${Number(newOrder.total || 0).toLocaleString()} ر.ي`,
            icon: <ShoppingBag className="w-4 h-4 text-primary" />,
            action: { label: "عرض الطلبات", onClick: () => navigate("/delivery/orders") },
            duration: 15000,
          });
        }
      );
    }

    // ── 5. New shipment request (supplier only) ─────────────────
    if (role === "supplier") {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shipment_requests", filter: `supplier_id=eq.${user.id}` },
        (payload) => {
          const req = payload.new as any;
          playNewOrderSound();
          toast("📦 طلب شحن جديد!", {
            description: `${req.recipient_name || "عميل"} — يحتاج تأكيداً وتسعيراً`,
            icon: <Package className="w-4 h-4 text-primary" />,
            action: { label: "عرض الطلبات", onClick: () => navigate("/supplier/shipments") },
            duration: 15000,
          });
        }
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, role]);

  return null;
};

export default RealtimeToastListener;
