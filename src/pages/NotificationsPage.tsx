import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Check, ArrowRight, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/landing/Header";

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data || []);
      setLoading(false);
    };
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <>
      <Header />
      <div className="pt-20 pb-10 container mx-auto px-4 max-w-2xl" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowRight className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              الإشعارات
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/notification-settings")} className="gap-1">
              <Settings className="w-4 h-4" />
              الإعدادات
            </Button>
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1">
              <Check className="w-4 h-4" />
              قراءة الكل
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد إشعارات حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`cursor-pointer transition-colors ${!n.read_at ? "border-primary/30 bg-primary/5" : ""}`}
                onClick={() => !n.read_at && markAsRead(n.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {!n.read_at && <div className="w-2 h-2 rounded-full bg-primary" />}
                        <p className="font-semibold text-sm">{n.title}</p>
                      </div>
                      {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap mr-3">
                      {new Date(n.created_at).toLocaleDateString("ar-YE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsPage;
