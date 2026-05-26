import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationBellProps {
  notificationsPath: string;
  className?: string;
}

const NotificationBell = ({ notificationsPath, className = "" }: NotificationBellProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }

    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
      .then(({ count }) => setUnreadCount(count || 0));

    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`notif-bell-${user.id}-${notificationsPath}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setUnreadCount(c => c + 1))
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("read_at", null)
          .then(({ count }) => setUnreadCount(count || 0));
      })
      .subscribe();

    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [user?.id, notificationsPath]);

  const handleClick = () => {
    navigate(notificationsPath);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`relative ${className}`}
      onClick={handleClick}
      title="الإشعارات"
    >
      <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-primary animate-bounce" : ""}`} />
      {unreadCount > 0 && (
        <>
          <Badge className="absolute -top-1 -left-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-card flex items-center justify-center z-10 pointer-events-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
          <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-red-500 opacity-60 animate-ping pointer-events-none" />
        </>
      )}
    </Button>
  );
};

export default NotificationBell;
