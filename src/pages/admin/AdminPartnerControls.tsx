import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { upsertPartnerSettings, getAllPartnerSettings, PartnerSettings } from "@/lib/partnerSettingsApi";
import { Loader2, Search, Shield, Users } from "lucide-react";

const roleLabels: Record<string, string> = {
  supplier: "مورد",
  delivery_company: "شركة توصيل",
  driver: "سائق",
};

const AdminPartnerControls = () => {
  const { sendPushNotification } = useNotifications();
  const [partners, setPartners] = useState<any[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, PartnerSettings>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get partners (non-customer, non-admin roles)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["supplier", "delivery_company", "driver"]);

      if (!roles || roles.length === 0) {
        setPartners([]);
        setLoading(false);
        return;
      }

      const userIds = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, company_name, violations_count")
        .in("user_id", userIds);

      const roleMap: Record<string, string> = {};
      roles.forEach((r: any) => { roleMap[r.user_id] = r.role; });

      const combined = (profiles || []).map((p: any) => ({
        ...p,
        role: roleMap[p.user_id] || "unknown",
      }));

      setPartners(combined);

      // Get all partner settings
      const allSettings = await getAllPartnerSettings();
      const sMap: Record<string, PartnerSettings> = {};
      allSettings.forEach((s) => { sMap[s.partner_id] = s; });
      setSettingsMap(sMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleDirectPayment = async (partnerId: string, currentValue: boolean) => {
    setUpdating(partnerId);
    try {
      const existing = settingsMap[partnerId];
      await upsertPartnerSettings({
        partner_id: partnerId,
        allow_direct_payment: !currentValue,
        cash_on_delivery_enabled: existing?.cash_on_delivery_enabled ?? true,
        cash_on_ride_enabled: existing?.cash_on_ride_enabled ?? true,
      });

      setSettingsMap((prev) => ({
        ...prev,
        [partnerId]: {
          ...prev[partnerId],
          partner_id: partnerId,
          allow_direct_payment: !currentValue,
          cash_on_delivery_enabled: prev[partnerId]?.cash_on_delivery_enabled ?? true,
          cash_on_ride_enabled: prev[partnerId]?.cash_on_ride_enabled ?? true,
        },
      }));

      // Notify partner
      if (currentValue) {
        try {
          await sendPushNotification({
            userId: partnerId,
            title: "تنبيه: تعطيل الدفع المباشر ⚠️",
            body: "تم تعطيل خاصية الدفع المباشر لحسابك من قبل الإدارة",
            data: { type: "payment_settings_changed" },
          });
        } catch {}
      }

      toast({
        title: "تم التحديث",
        description: !currentValue ? "تم تفعيل الدفع المباشر" : "تم تعطيل الدفع المباشر",
      });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const filtered = partners.filter((p) => {
    const matchesSearch =
      !search ||
      p.full_name?.includes(search) ||
      p.company_name?.includes(search) ||
      p.phone?.includes(search);
    const matchesRole = roleFilter === "all" || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6" />
          إدارة صلاحيات الدفع للشركاء
        </h2>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الدور" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="supplier">مورد</SelectItem>
            <SelectItem value="delivery_company">شركة توصيل</SelectItem>
            <SelectItem value="driver">سائق</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا يوجد شركاء</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>المخالفات</TableHead>
                  <TableHead>الدفع المباشر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const settings = settingsMap[p.user_id];
                  const directPayment = settings?.allow_direct_payment ?? false;

                  return (
                    <TableRow key={p.user_id}>
                      <TableCell className="font-medium">
                        {p.company_name || p.full_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[p.role] || p.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={p.violations_count > 0 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {p.violations_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={directPayment}
                            onCheckedChange={() => handleToggleDirectPayment(p.user_id, directPayment)}
                            disabled={updating === p.user_id}
                          />
                          <span className="text-xs text-muted-foreground">
                            {directPayment ? "مفعّل" : "معطّل"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPartnerControls;
