import { useState } from "react";
import { Settings, Plus, Trash2, Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertRule, createAlertRule, updateAlertRule, deleteAlertRule } from "@/lib/alertsApi";
import { toast } from "sonner";

const METRIC_OPTIONS = [
  { value: "error_rate_hour", label: "أخطاء آخر ساعة" },
  { value: "error_rate_5min", label: "أخطاء آخر 5 دقائق" },
  { value: "failed_transactions", label: "معاملات فاشلة" },
  { value: "unresolved_errors", label: "أخطاء غير محلولة" },
];

const OPERATOR_OPTIONS = [
  { value: ">", label: "أكبر من" },
  { value: ">=", label: "أكبر أو يساوي" },
  { value: "<", label: "أقل من" },
  { value: "=", label: "يساوي" },
];

interface Props {
  rules: AlertRule[];
  onUpdate: () => void;
}

const AlertRulesManager = ({ rules, onUpdate }: Props) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rule_name: "",
    rule_type: "error_rate",
    metric: "error_rate_hour",
    operator: ">",
    value: 10,
    severity: "warning",
  });

  const handleCreate = async () => {
    if (!form.rule_name.trim()) { toast.error("أدخل اسم القاعدة"); return; }
    try {
      await createAlertRule({
        rule_name: form.rule_name,
        rule_type: form.rule_type,
        condition: { metric: form.metric, operator: form.operator, value: form.value },
        severity: form.severity,
      });
      toast.success("تم إنشاء قاعدة التنبيه");
      setOpen(false);
      setForm({ rule_name: "", rule_type: "error_rate", metric: "error_rate_hour", operator: ">", value: 10, severity: "warning" });
      onUpdate();
    } catch { toast.error("خطأ في الإنشاء"); }
  };

  const handleToggle = async (rule: AlertRule) => {
    try {
      await updateAlertRule(rule.id, { is_active: !rule.is_active } as any);
      toast.success(rule.is_active ? "تم تعطيل القاعدة" : "تم تفعيل القاعدة");
      onUpdate();
    } catch { toast.error("خطأ"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAlertRule(id);
      toast.success("تم حذف القاعدة");
      onUpdate();
    } catch { toast.error("خطأ في الحذف"); }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" /> قواعد التنبيهات
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="w-4 h-4 ml-1" /> قاعدة جديدة</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>إنشاء قاعدة تنبيه</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم القاعدة</Label>
                <Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} placeholder="مثال: تجاوز عدد الأخطاء" />
              </div>
              <div>
                <Label>المقياس</Label>
                <Select value={form.metric} onValueChange={(v) => setForm({ ...form, metric: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الشرط</Label>
                  <Select value={form.operator} onValueChange={(v) => setForm({ ...form, operator: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATOR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>القيمة</Label>
                  <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>الحدة</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">معلومات</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                    <SelectItem value="critical">حرج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">إنشاء القاعدة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
        {rules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">لا توجد قواعد تنبيهات</p>
        ) : (
          <div className="divide-y">
            {rules.map((r) => {
              const cond = r.condition;
              const metricLabel = METRIC_OPTIONS.find((m) => m.value === cond.metric)?.label || cond.metric;
              return (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {r.rule_name}
                      <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">
                        {r.is_active ? "مفعل" : "معطل"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{r.severity}</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metricLabel} {cond.operator} {cond.value}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleToggle(r)}>
                      {r.is_active ? <PowerOff className="w-3.5 h-3.5 text-yellow-600" /> : <Power className="w-3.5 h-3.5 text-green-600" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertRulesManager;
