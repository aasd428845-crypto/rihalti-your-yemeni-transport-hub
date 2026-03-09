import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Send, Search, X, Users, User } from "lucide-react";

interface UserProfile {
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role?: string;
}

const ROLE_OPTIONS = [
  { value: "all", label: "جميع المستخدمين" },
  { value: "customer", label: "العملاء فقط" },
  { value: "supplier", label: "الموردين فقط" },
  { value: "delivery_company", label: "شركات التوصيل فقط" },
  { value: "driver", label: "السائقين فقط" },
  { value: "delivery_driver", label: "مناديب التوصيل فقط" },
  { value: "specific", label: "مستخدمين محددين" },
];

const ROLE_LABELS: Record<string, string> = {
  customer: "عميل",
  supplier: "مورد",
  delivery_company: "شركة توصيل",
  driver: "سائق",
  delivery_driver: "مندوب",
  admin: "مشرف",
};

const AdminSendNotification = () => {
  const { user } = useAuth();
  const [targetType, setTargetType] = useState("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendPush, setSendPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (targetType === "specific") loadUsers();
  }, [targetType]);

  const loadUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, phone, avatar_url"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map((rolesRes.data || []).map((r) => [r.user_id, r.role]));
    setAllUsers(
      (profilesRes.data || []).map((p) => ({ ...p, role: roleMap.get(p.user_id) || "customer" }))
    );
    setLoading(false);
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      !selectedUsers.some((s) => s.user_id === u.user_id) &&
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery))
  );

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("يرجى ملء عنوان ونص الإشعار");
      return;
    }
    if (targetType === "specific" && selectedUsers.length === 0) {
      toast.error("يرجى اختيار مستخدم واحد على الأقل");
      return;
    }

    setSending(true);
    try {
      let targetUserIds: string[] = [];

      if (targetType === "specific") {
        targetUserIds = selectedUsers.map((u) => u.user_id);
      } else if (targetType !== "all") {
        const { data: roleUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", targetType as any);
        targetUserIds = (roleUsers || []).map((r) => r.user_id);
      } else {
        const { data: allProfiles } = await supabase.from("profiles").select("user_id");
        targetUserIds = (allProfiles || []).map((p) => p.user_id);
      }

      if (targetUserIds.length === 0) {
        toast.error("لا يوجد مستخدمون مطابقون");
        setSending(false);
        return;
      }

      // Insert in-app notifications
      const notifications = targetUserIds.map((uid) => ({
        user_id: uid,
        title,
        body,
        sent_by: user?.id,
        notification_type: "admin",
        data: { target_type: targetType },
      }));

      const { error: insertError } = await supabase.from("notifications").insert(notifications);
      if (insertError) throw insertError;

      // Send push if enabled
      if (sendPush) {
        if (targetType === "specific" || targetType === "all") {
          await supabase.functions.invoke("send-push-notification", {
            body: { userIds: targetUserIds, title, body, sound: "default", data: { type: "admin" } },
          });
        } else {
          await supabase.functions.invoke("send-push-notification", {
            body: { targetRole: targetType, title, body, sound: "default", data: { type: "admin" } },
          });
        }
      }

      toast.success(`تم إرسال الإشعار إلى ${targetUserIds.length} مستخدم`);
      setTitle("");
      setBody("");
      setSelectedUsers([]);
    } catch (err: any) {
      toast.error("فشل إرسال الإشعار: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إرسال إشعار</h1>
          <p className="text-sm text-muted-foreground">أرسل إشعارات موجهة للمستخدمين</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">تفاصيل الإشعار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>المستلمون</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عنوان الإشعار</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="أدخل عنوان الإشعار..." />
            </div>

            <div className="space-y-2">
              <Label>نص الإشعار</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="أدخل نص الإشعار..." rows={4} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-muted-foreground" />
                <Label>إرسال إشعار فوري (Push)</Label>
              </div>
              <Switch checked={sendPush} onCheckedChange={setSendPush} />
            </div>

            <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
              <Send className="w-4 h-4" />
              {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
            </Button>
          </CardContent>
        </Card>

        {/* Right: User selector (only for specific) */}
        {targetType === "specific" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                اختيار المستلمين
                {selectedUsers.length > 0 && (
                  <Badge variant="secondary">{selectedUsers.length} محدد</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Selected users */}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <Badge key={u.user_id} variant="outline" className="gap-1 py-1">
                      {u.full_name || "بدون اسم"}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSelectedUsers((prev) => prev.filter((s) => s.user_id !== u.user_id))}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف..."
                  className="pr-9"
                />
              </div>

              {/* User list */}
              <ScrollArea className="h-[350px]">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">جاري التحميل...</p>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.user_id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => setSelectedUsers((prev) => [...prev, u])}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            <User className="w-3.5 h-3.5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.full_name || "بدون اسم"}</p>
                          <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {ROLE_LABELS[u.role || "customer"] || u.role}
                        </Badge>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-center text-muted-foreground py-6 text-sm">لا توجد نتائج</p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSendNotification;
