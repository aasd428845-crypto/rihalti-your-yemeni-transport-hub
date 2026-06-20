import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPartnerCommissionSettings, upsertPartnerCommission, generateMonthlyInvoicesForAllPartners } from "@/lib/accountingApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Percent, RefreshCw, FileText } from "lucide-react";

interface PartnerRow {
  id: string;
  name: string;
  type: "delivery_company" | "restaurant";
}

const AdminCommissionOverrides = () => {
  const { toast } = useToast();
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { type: string; value: number; on: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Load delivery company partners from user_roles + profiles
        const { data: roles } = await (supabase as any)
          .from("user_roles")
          .select("user_id, role")
          .eq("role", "delivery_company");

        const list: PartnerRow[] = [];

        if (roles && roles.length > 0) {
          const ids = roles.map((r: any) => r.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", ids);

          for (const r of roles) {
            const profile = (profilesData || []).find((p: any) => p.user_id === r.user_id);
            list.push({
              id: r.user_id,
              name: (profile as any)?.full_name || r.user_id.slice(0, 8),
              type: "delivery_company",
            });
          }
        }

        // Load per-partner commission overrides
        const withOverrides = await Promise.all(
          list.map(async (p) => {
            const { data } = await getPartnerCommissionSettings(p.id);
            return { ...p, override: data as any };
          })
        );

        setPartners(withOverrides);

        const initEditing: Record<string, { type: string; value: number; on: boolean }> = {};
        withOverrides.forEach((p: any) => {
          initEditing[p.id] = {
            type: p.override?.commission_type || "percentage",
            value: p.override?.commission_value ?? 0,
            on: p.override?.override_global ?? false,
          };
        });
        setEditing(initEditing);
      } catch (err: any) {
        toast({ title: "خطأ في تحميل الشركاء", description: err.message, variant: "destructive" });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async (partnerId: string) => {
    setSaving(partnerId);
    const e = editing[partnerId];
    try {
      await upsertPartnerCommission(partnerId, e.type, e.value, e.on);
      toast({ title: "✓ تم حفظ نسبة العمولة المخصصة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setSaving(null);
  };

  const handleGenerateInvoices = async () => {
    setGeneratingInvoices(true);
    try {
      const results = await generateMonthlyInvoicesForAllPartners();
      toast({ title: `✓ تم توليد ${results.length} فاتورة للشهر الماضي` });
    } catch (err: any) {
      toast({ title: "خطأ في توليد الفواتير", description: err.message, variant: "destructive" });
    }
    setGeneratingInvoices(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Percent className="w-6 h-6" />نسب العمولة المخصصة للشركاء</h1>
          <p className="text-sm text-muted-foreground mt-1">
            افتراضياً تُطبَّق النسبة العامة من إعدادات المحاسبة. يمكنك هنا تخصيص نسبة مختلفة لشريك معين.
          </p>
        </div>
        <Button variant="outline" onClick={handleGenerateInvoices} disabled={generatingInvoices}>
          <FileText className="w-4 h-4 ml-2" />
          {generatingInvoices ? "جارٍ التوليد..." : "توليد فواتير الشهر الماضي"}
        </Button>
      </div>

      {partners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Percent className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>لا يوجد شركاء مسجلون بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {partners.map((p) => {
            const e = editing[p.id] || { type: "percentage", value: 0, on: false };
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[140px]">
                      <p className="font-bold">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">
                          {p.type === "delivery_company" ? "شركة توصيل" : "مطعم"}
                        </Badge>
                        {e.on && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                            نسبة مخصصة: {e.value}{e.type === "percentage" ? "%" : " ر.ي"}
                          </Badge>
                        )}
                        {!e.on && (
                          <span className="text-xs text-muted-foreground">يستخدم النسبة العامة</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">تخصيص نسبة؟</Label>
                      <Switch
                        checked={e.on}
                        onCheckedChange={(v) => setEditing(prev => ({ ...prev, [p.id]: { ...e, on: v } }))}
                      />
                    </div>

                    {e.on && (
                      <>
                        <Select
                          value={e.type}
                          onValueChange={(v) => setEditing(prev => ({ ...prev, [p.id]: { ...e, type: v } }))}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">نسبة %</SelectItem>
                            <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          type="number"
                          min={0}
                          max={e.type === "percentage" ? 100 : undefined}
                          value={e.value}
                          onChange={(ev) => setEditing(prev => ({ ...prev, [p.id]: { ...e, value: Number(ev.target.value) } }))}
                          className="w-24"
                          placeholder={e.type === "percentage" ? "10" : "500"}
                        />
                      </>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleSave(p.id)}
                      disabled={saving === p.id}
                    >
                      {saving === p.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "حفظ"}
                    </Button>
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

export default AdminCommissionOverrides;
