import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "في الانتظار", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "مكتمل", color: "bg-green-100 text-green-700" },
  failed: { label: "فشل", color: "bg-red-100 text-red-700" },
};

const DeliveryPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("financial_transactions" as any)
        .select("*")
        .eq("partner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setPayments(data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">المدفوعات</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد معاملات مالية بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p: any) => {
            const statusInfo = STATUS_MAP[p.status] || { label: p.status, color: "bg-gray-100 text-gray-600" };
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">{p.description || p.type || "معاملة"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <p className="text-lg font-black">{Number(p.amount || 0).toLocaleString()} <span className="text-xs font-normal">ر.ي</span></p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeliveryPayments;
