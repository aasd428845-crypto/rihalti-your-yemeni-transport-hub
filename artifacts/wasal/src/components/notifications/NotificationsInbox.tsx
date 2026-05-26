import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Check, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NavResolver = (data: any, type?: string) => string | null;

interface NotificationsInboxProps {
  title?: string;
  backPath?: string;
  resolveNav: NavResolver;
  onUnreadChange?: (count: number) => void;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `منذ ${days} أيام`;
  return new Date(dateStr).toLocaleDateString("ar-YE", { day: "numeric", month: "short" });
};

const notifIcon = (type?: string) => {
  if (!type) return "🔔";
  if (type.includes("order") || type.includes("rider")) return "📦";
  if (type.includes("payment")) return "💳";
  if (type.includes("support")) return "💬";
  if (type.includes("join") || type.includes("company")) return "🏢";
  if (type.includes("invoice")) return "🧾";
  if (type.includes("trip")) return "🚌";
  if (type.includes("promo")) return "🎁";
  return "🔔";
};

const NotificationsInbox = ({
  title = "الإشعارات",
  backPath,
  resolveNav,
  onUnreadChange,
}: NotificationsInboxProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80);
    setNotifications(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: new notifications arrive
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-inbox-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markAsRead = async (notif: any) => {
    if (notif.read_at) {
      // Already read — just navigate
      const dest = resolveNav(notif.data, notif.notification_type || notif.data?.type);
      if (dest) navigate(dest);
      return;
    }
    // Mark read first
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notif.id);
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)
    );
    // Navigate
    const dest = resolveNav(notif.data, notif.notification_type || notif.data?.type);
    if (dest) navigate(dest);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  if (!user) { navigate("/login"); return null; }

  return (
    <div className="pb-10 max-w-2xl mx-auto px-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div className="flex items-center gap-2">
          {backPath !== undefined && (
            <button
              onClick={() => backPath ? navigate(backPath) : navigate(-1)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {title}
          </h1>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-bold">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1 text-xs">
            <Check className="w-3.5 h-3.5" />
            قراءة الكل
          </Button>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <BellOff className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">لا توجد إشعارات حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const isUnread = !n.read_at;
            const nType = n.notification_type || n.data?.type || "";
            const hasNav = !!resolveNav(n.data, nType);
            return (
              <div
                key={n.id}
                onClick={() => markAsRead(n)}
                className={`
                  flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                  ${isUnread
                    ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                    : "border-border bg-card hover:bg-muted/40"
                  }
                  ${hasNav ? "hover:shadow-sm" : ""}
                `}
              >
                <div className={`text-xl shrink-0 mt-0.5 ${isUnread ? "" : "opacity-60"}`}>
                  {notifIcon(nType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                      <p className={`text-sm font-semibold truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className={`text-xs mt-0.5 line-clamp-2 ${isUnread ? "text-foreground/80" : "text-muted-foreground"}`}>
                      {n.body}
                    </p>
                  )}
                  {hasNav && isUnread && (
                    <p className="text-[10px] text-primary mt-1">اضغط للانتقال ←</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsInbox;
