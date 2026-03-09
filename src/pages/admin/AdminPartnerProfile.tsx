import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ArrowRight, Phone, Mail, Calendar, Building2, DollarSign, TrendingUp, Hash, CreditCard, User, FileText, BarChart3, Receipt, Gift, Play, Pause, PlusCircle } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { toast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = { booking: "حجز", shipment: "شحن", delivery: "توصيل", ride: "أجرة" };
const statusLabels: Record<string, string> = { pending: "قيد الانتظار", paid: "مدفوع", overdue: "متأخر", cancelled: "ملغي" };
const accountStatusLabels: Record<string, string> = { approved: "نشط", suspended: "موقوف", pending: "معلق", rejected: "مرفوض" };
const accountStatusColors: Record<string, string> = {
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  rejected: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const AdminPartnerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Trial
  const [trialMonths, setTrialMonths] = useState("1");
  const [trialDialog, setTrialDialog] = useState(false);
  const [trialAction, setTrialAction] = useState<"activate" | "extend">("activate");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      const [profileRes, roleRes, bankRes, txRes, invRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
        supabase.from("partner_bank_accounts").select("*").eq("partner_id", id),
        supabase.from("financial_transactions").select("*").eq("partner_id", id).order("created_at", { ascending: false }),
        supabase.from("partner_invoices").select("*").eq("partner_id", id).order("created_at", { ascending: false }),
      ]);
      setProfile(profileRes.data);
      setRole(roleRes.data?.role || "");
      setBankAccounts(bankRes.data || []);
      setTransactions(txRes.data || []);
      setInvoices(invRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  const stats = useMemo(() => {
    const total = transactions.length;
    const totalAmount = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalCommission = transactions.reduce((s, t) => s + Number(t.platform_commission || 0), 0);
    const netEarning = transactions.reduce((s, t) => s + Number(t.partner_earning || 0), 0);
    return { total, totalAmount, totalCommission, netEarning };
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; amount: number; commission: number; earning: number }>();
    transactions.forEach((t) => {
      const m = format(new Date(t.created_at), "yyyy-MM");
      const label = format(new Date(t.created_at), "MMM yyyy", { locale: ar });
      const ex = map.get(m) || { month: label, amount: 0, commission: 0, earning: 0 };
      ex.amount += Number(t.amount || 0);
      ex.commission += Number(t.platform_commission || 0);
      ex.earning += Number(t.partner_earning || 0);
      map.set(m, ex);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [transactions]);

  const updateStatus = async (newStatus: string) => {
    if (!id) return;
    const { error } = await supabase.from("profiles").update({ account_status: newStatus }).eq("user_id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setProfile((prev: any) => prev ? { ...prev, account_status: newStatus } : null);
      toast({ title: "تم التحديث", description: `تم تغيير الحالة إلى ${accountStatusLabels[newStatus] || newStatus}` });
    }
  };

  // Trial period functions
  const handleActivateTrial = async () => {
    if (!id) return;
    const months = parseInt(trialMonths) || 1;
    const now = new Date();
    const base = trialAction === "extend" && profile?.trial_end_date
      ? new Date(profile.trial_end_date)
      : now;
    const endDate = new Date(base);
    endDate.setMonth(endDate.getMonth() + months);

    const { error } = await supabase.from("profiles").update({
      is_trial_active: true,
      trial_start_date: trialAction === "activate" ? now.toISOString() : profile?.trial_start_date || now.toISOString(),
      trial_end_date: endDate.toISOString(),
    }).eq("user_id", id);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setProfile((prev: any) => ({
        ...prev,
        is_trial_active: true,
        trial_start_date: trialAction === "activate" ? now.toISOString() : prev?.trial_start_date || now.toISOString(),
        trial_end_date: endDate.toISOString(),
      }));
      toast({ title: "تم", description: trialAction === "activate" ? "تم تفعيل الفترة المجانية" : "تم تمديد الفترة المجانية" });
    }
    setTrialDialog(false);
  };

  const handleEndTrial = async () => {
    if (!id) return;
    const { error } = await supabase.from("profiles").update({ is_trial_active: false }).eq("user_id", id);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setProfile((prev: any) => prev ? { ...prev, is_trial_active: false } : null);
      toast({ title: "تم", description: "تم إنهاء الفترة المجانية" });
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!profile) return <div className="text-center py-20 text-muted-foreground">لم يتم العثور على الشريك</div>;

  const roleLabels: Record<string, string> = { supplier: "مورد", delivery_company: "شركة توصيل", driver: "سائق", delivery_driver: "سائق توصيل" };
  const isTrialActive = profile.is_trial_active && profile.trial_end_date && new Date(profile.trial_end_date) > new Date();

  return (
    <div className="space-y-6" dir="rtl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {(profile.full_name || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.full_name || "بدون اسم"}</h1>
                <Badge className={accountStatusColors[profile.account_status] || "bg-muted"}>
                  {accountStatusLabels[profile.account_status] || profile.account_status || "غير محدد"}
                </Badge>
                <Badge variant="outline">{roleLabels[role] || role}</Badge>
                {isTrialActive && <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">فترة مجانية</Badge>}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.phone && <a href={`tel:${profile.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="h-4 w-4" /> {profile.phone}</a>}
                {profile.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {profile.email}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> انضم: {format(new Date(profile.created_at), "dd/MM/yyyy")}</span>
                {profile.city && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {profile.city}</span>}
              </div>
            </div>
            <div className="shrink-0">
              <Select value={profile.account_status || "pending"} onValueChange={updateStatus}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">نشط</SelectItem>
                  <SelectItem value="suspended">موقوف</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900"><Hash className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">عدد المعاملات</p><p className="text-xl font-bold">{stats.total}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-100 dark:bg-green-900"><DollarSign className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">إجمالي المبالغ</p><p className="text-xl font-bold">{stats.totalAmount.toLocaleString()} ر.ي</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900"><TrendingUp className="h-5 w-5 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">إجمالي العمولة</p><p className="text-xl font-bold">{stats.totalCommission.toLocaleString()} ر.ي</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900"><CreditCard className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">صافي المستحق</p><p className="text-xl font-bold">{stats.netEarning.toLocaleString()} ر.ي</p></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="profile" className="gap-1"><User className="h-4 w-4" /> الملف الشخصي</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1"><FileText className="h-4 w-4" /> المعاملات المالية</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1"><BarChart3 className="h-4 w-4" /> التقارير</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1"><Receipt className="h-4 w-4" /> الفواتير</TabsTrigger>
          <TabsTrigger value="trial" className="gap-1"><Gift className="h-4 w-4" /> الفترة المجانية</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">المعلومات الشخصية</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="الاسم" value={profile.full_name} />
                <InfoRow label="الهاتف" value={profile.phone} />
                <InfoRow label="المدينة" value={profile.city} />
                <InfoRow label="الدور" value={roleLabels[role] || role} />
                <InfoRow label="تاريخ الانضمام" value={format(new Date(profile.created_at), "dd/MM/yyyy")} />
                <InfoRow label="حالة الحساب" value={accountStatusLabels[profile.account_status] || "غير محدد"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">الحسابات البنكية</CardTitle></CardHeader>
              <CardContent>
                {bankAccounts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">لا توجد حسابات بنكية مسجلة</p>
                ) : (
                  <div className="space-y-3">
                    {bankAccounts.map((acc) => (
                      <div key={acc.id} className="p-3 border rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{acc.bank_name}</span>
                          {acc.is_primary && <Badge variant="secondary">رئيسي</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">صاحب الحساب: {acc.account_name}</p>
                        <p className="text-sm text-muted-foreground">رقم الحساب: {acc.account_number}</p>
                        {acc.iban && <p className="text-sm text-muted-foreground">IBAN: {acc.iban}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-4">
              {transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد معاملات</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>العمولة</TableHead>
                        <TableHead>الصافي</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm">{format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell><Badge variant="outline">{typeLabels[tx.transaction_type] || tx.transaction_type}</Badge></TableCell>
                          <TableCell className="font-medium">{Number(tx.amount).toLocaleString()} ر.ي</TableCell>
                          <TableCell className="text-orange-600">{Number(tx.platform_commission).toLocaleString()} ر.ي</TableCell>
                          <TableCell className="text-green-600">{Number(tx.partner_earning).toLocaleString()} ر.ي</TableCell>
                          <TableCell>{tx.payment_method === "cash" ? "نقدي" : tx.payment_method === "transfer" ? "تحويل" : tx.payment_method}</TableCell>
                          <TableCell>
                            <Badge className={tx.payment_status === "paid" ? "bg-green-100 text-green-800" : tx.payment_status === "overdue" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                              {statusLabels[tx.payment_status] || tx.payment_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">الإيرادات والعمولة الشهرية</CardTitle></CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد بيانات كافية</p>
                ) : (
                  <ChartContainer config={{ amount: { label: "الإيرادات", color: "hsl(var(--primary))" }, commission: { label: "العمولة", color: "hsl(25, 95%, 53%)" } }} className="h-[300px]">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="amount" name="الإيرادات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="commission" name="العمولة" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">صافي الأرباح الشهرية</CardTitle></CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد بيانات كافية</p>
                ) : (
                  <ChartContainer config={{ earning: { label: "الصافي", color: "hsl(142, 71%, 45%)" } }} className="h-[300px]">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="earning" name="الصافي" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-4">
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد فواتير</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>الفترة</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>العمولة</TableHead>
                        <TableHead>الصافي</TableHead>
                        <TableHead>تاريخ الاستحقاق</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.period_start} → {inv.period_end}</TableCell>
                          <TableCell>{inv.period_type === "weekly" ? "أسبوعي" : inv.period_type === "monthly" ? "شهري" : inv.period_type === "yearly" ? "سنوي" : "—"}</TableCell>
                          <TableCell>{Number(inv.total_amount).toLocaleString()} ر.ي</TableCell>
                          <TableCell>{Number(inv.total_commission).toLocaleString()} ر.ي</TableCell>
                          <TableCell>{Number(inv.net_amount).toLocaleString()} ر.ي</TableCell>
                          <TableCell>{inv.due_date}</TableCell>
                          <TableCell>
                            <Badge className={inv.status === "paid" ? "bg-green-100 text-green-800" : inv.status === "overdue" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                              {inv.status === "paid" ? "مدفوعة" : inv.status === "overdue" ? "متأخرة" : "معلقة"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Period Tab */}
        <TabsContent value="trial">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Gift className="h-5 w-5" /> إدارة الفترة المجانية</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center space-y-1">
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge className={isTrialActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {isTrialActive ? "مفعّلة" : "غير مفعّلة"}
                  </Badge>
                </div>
                <div className="p-4 border rounded-lg text-center space-y-1">
                  <p className="text-sm text-muted-foreground">تاريخ البداية</p>
                  <p className="font-medium">{profile.trial_start_date ? format(new Date(profile.trial_start_date), "dd/MM/yyyy") : "—"}</p>
                </div>
                <div className="p-4 border rounded-lg text-center space-y-1">
                  <p className="text-sm text-muted-foreground">تاريخ النهاية</p>
                  <p className="font-medium">{profile.trial_end_date ? format(new Date(profile.trial_end_date), "dd/MM/yyyy") : "—"}</p>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {!isTrialActive && (
                  <Button onClick={() => { setTrialAction("activate"); setTrialMonths("1"); setTrialDialog(true); }} className="gap-2">
                    <Play className="h-4 w-4" /> تفعيل الفترة المجانية
                  </Button>
                )}
                {isTrialActive && (
                  <>
                    <Button variant="outline" onClick={() => { setTrialAction("extend"); setTrialMonths("1"); setTrialDialog(true); }} className="gap-2">
                      <PlusCircle className="h-4 w-4" /> تمديد الفترة
                    </Button>
                    <Button variant="destructive" onClick={handleEndTrial} className="gap-2">
                      <Pause className="h-4 w-4" /> إنهاء الفترة المجانية
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trial Dialog */}
      <Dialog open={trialDialog} onOpenChange={setTrialDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{trialAction === "activate" ? "تفعيل الفترة المجانية" : "تمديد الفترة المجانية"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>عدد الأشهر</Label>
              <Input type="number" min="1" max="24" value={trialMonths} onChange={e => setTrialMonths(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleActivateTrial}>
              {trialAction === "activate" ? "تفعيل" : "تمديد"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value || "—"}</span>
  </div>
);

export default AdminPartnerProfile;
