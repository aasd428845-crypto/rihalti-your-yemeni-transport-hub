import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Send, Clock } from "lucide-react";
import { toast } from "sonner";

const SupplierPromotions = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("customers");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("bulk_notifications")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setHistory(data);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          targetRole: target === "all" ? undefined : target === "customers" ? "customer" : "driver",
          title,
          body,
          sound: "promotion",
          data: { type: "promotion", supplierId: user.id },
        },
      });

      if (error) throw error;

      await supabase.from("bulk_notifications").insert({
        created_by: user.id,
        target_role: target,
        title,
        body,
        sound: "promotion",
        status: "sent",
        sent_count: 0,
        sent_at: new Date().toISOString(),
      } as any);

      toast.success("تم إرسال الإشعار بنجاح");
      setTitle("");
      setBody("");

      // Refresh history
      const { data } = await supabase
        .from("bulk_notifications")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setHistory(data);
    } catch (err) {
      console.error(err);
      toast.error("فشل إرسال الإشعار");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-primary" />
        إرسال عروض ترويجية
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>إشعار جديد</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>المستهدفون</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">العملاء</SelectItem>
                  <SelectItem value="drivers">السائقون</SelectItem>
                  <SelectItem value="all">الجميع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عنوان الإشعار</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: خصم 20% على جميع الرحلات" maxLength={50} required />
            </div>

            <div className="space-y-2">
              <Label>نص الإشعار</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب تفاصيل العرض..." maxLength={200} rows={3} required />
            </div>

            <Button type="submit" disabled={sending} className="w-full gap-2">
              <Send className="w-4 h-4" />
              {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              سجل الإشعارات المرسلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${item.status === "sent" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {item.status === "sent" ? "تم الإرسال" : "معلق"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(item.created_at).toLocaleDateString("ar-YE")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupplierPromotions;
