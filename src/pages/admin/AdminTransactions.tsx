import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { getFinancialTransactions } from "@/lib/accountingApi";
import StatCard from "@/components/admin/dashboard/StatsCards";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { DollarSign, TrendingUp, Hash, Users, Phone, Eye, CalendarIcon, Search, Building2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = { booking: "حجز", shipment: "شحن", delivery: "توصيل", ride: "أجرة" };
const statusLabels: Record<string, string> = { pending: "قيد الانتظار", paid: "مدفوع", overdue: "متأخر", cancelled: "ملغي" };
const paymentLabels: Record<string, string> = { cash: "نقدي", later: "مؤجل", transfer: "تحويل" };

const AdminTransactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [partnerDetails, setPartnerDetails] = useState<any | null>(null);
  const [partnerBankAccounts, setPartnerBankAccounts] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await getFinancialTransactions({ type: typeFilter, status: statusFilter });
    let results = data || [];

    // Enrich with partner info from profiles
    const partnerIds = [...new Set(results.map((t: any) => t.partner_id))];
    if (partnerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, city, avatar_url, created_at")
        .in("user_id", partnerIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      results = results.map((t: any) => ({
        ...t,
        _partner_name: t.partner_name || profileMap.get(t.partner_id)?.full_name || "—",
        _partner_phone: t.partner_phone || profileMap.get(t.partner_id)?.phone || "—",
        _partner_profile: profileMap.get(t.partner_id),
      }));
    }

    setTransactions(results);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [typeFilter, statusFilter]);

  const filtered = transactions.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(t._partner_name?.toLowerCase().includes(q) || t._partner_phone?.includes(q))) return false;
    }
    if (dateFrom && new Date(t.created_at) < dateFrom) return false;
    if (dateTo && new Date(t.created_at) > dateTo) return false;
    return true;
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.created_at);
    return d >= monthStart && d <= monthEnd;
  });

  const totalCommissionMonth = thisMonthTx.reduce((s, t) => s + Number(t.platform_commission), 0);
  const totalAmount = filtered.reduce((s, t) => s + Number(t.amount), 0);
  const totalPartnerEarning = filtered.reduce((s, t) => s + Number(t.partner_earning), 0);

  const openDetails = async (tx: any) => {
    setSelectedTx(tx);
    setPartnerDetails(tx._partner_profile || null);
    const { data: banks } = await supabase
      .from("partner_bank_accounts")
      .select("*")
      .eq("partner_id", tx.partner_id);
    setPartnerBankAccounts(banks || []);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-bold">المعاملات المالية</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="عمولة الشهر الحالي" value={`${totalCommissionMonth.toLocaleString()} ر.ي`} icon={TrendingUp} description={format(now, "MMMM yyyy", { locale: ar })} />
        <StatCard title="إجمالي المبالغ" value={`${totalAmount.toLocaleString()} ر.ي`} icon={DollarSign} />
        <StatCard title="إجمالي مبالغ الشركاء" value={`${totalPartnerEarning.toLocaleString()} ر.ي`} icon={Users} />
        <StatCard title="عدد المعاملات" value={filtered.length} icon={Hash} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9 w-56" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="booking">حجز</SelectItem>
            <SelectItem value="shipment">شحن</SelectItem>
            <SelectItem value="delivery">توصيل</SelectItem>
            <SelectItem value="ride">أجرة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">قيد الانتظار</SelectItem>
            <SelectItem value="paid">مدفوع</SelectItem>
            <SelectItem value="overdue">متأخر</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-36 justify-start text-right", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="ml-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "yyyy/MM/dd") : "من تاريخ"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-36 justify-start text-right", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="ml-2 h-4 w-4" />
              {dateTo ? format(dateTo, "yyyy/MM/dd") : "إلى تاريخ"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setSearchQuery(""); }}>مسح الفلاتر</Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">لا توجد معاملات</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الشريك</TableHead>
                    <TableHead>الحساب البنكي</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>العمولة</TableHead>
                    <TableHead>صافي الشريك</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(t.created_at), "yyyy/MM/dd HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[t.transaction_type] || t.transaction_type}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">{t._partner_name}</span>
                          {t._partner_phone && t._partner_phone !== "—" && (
                            <a href={`tel:${t._partner_phone}`} className="text-xs text-primary flex items-center gap-1">
                              <Phone className="w-3 h-3" />{t._partner_phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t.partner_bank_account || "—"}</TableCell>
                      <TableCell className="font-semibold">{Number(t.amount).toLocaleString()} ر.ي</TableCell>
                      <TableCell className="text-primary font-medium">{Number(t.platform_commission).toLocaleString()} ر.ي</TableCell>
                      <TableCell className="text-green-600 font-medium">{Number(t.partner_earning).toLocaleString()} ر.ي</TableCell>
                      <TableCell className="text-xs">{paymentLabels[t.payment_method] || t.payment_method}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", t.payment_status === "paid" && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", t.payment_status === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", t.payment_status === "overdue" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", t.payment_status === "cancelled" && "bg-muted text-muted-foreground")} variant="secondary">
                          {statusLabels[t.payment_status] || t.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openDetails(t)}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={(o) => { if (!o) { setSelectedTx(null); setPartnerDetails(null); } }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل المعاملة</DialogTitle>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-5 text-sm">
              {/* Transaction info */}
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="النوع" value={typeLabels[selectedTx.transaction_type] || selectedTx.transaction_type} />
                <DetailRow label="المبلغ" value={`${Number(selectedTx.amount).toLocaleString()} ر.ي`} />
                <DetailRow label="عمولة المنصة" value={`${Number(selectedTx.platform_commission).toLocaleString()} ر.ي`} />
                <DetailRow label="صافي الشريك" value={`${Number(selectedTx.partner_earning).toLocaleString()} ر.ي`} />
                <DetailRow label="طريقة الدفع" value={paymentLabels[selectedTx.payment_method] || selectedTx.payment_method} />
                <DetailRow label="الحالة" value={statusLabels[selectedTx.payment_status] || selectedTx.payment_status} />
                <DetailRow label="التاريخ" value={format(new Date(selectedTx.created_at), "yyyy/MM/dd HH:mm", { locale: ar })} />
                {selectedTx.due_date && <DetailRow label="تاريخ الاستحقاق" value={selectedTx.due_date} />}
                {selectedTx.notes && <div className="col-span-2"><DetailRow label="ملاحظات" value={selectedTx.notes} /></div>}
              </div>

              {/* Partner info */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4" />معلومات الشريك</h4>
                <div className="grid grid-cols-2 gap-3">
                  <DetailRow label="الاسم" value={selectedTx._partner_name} />
                  <DetailRow label="الهاتف" value={selectedTx._partner_phone} />
                  {partnerDetails?.city && <DetailRow label="المدينة" value={partnerDetails.city} />}
                  {partnerDetails?.created_at && <DetailRow label="تاريخ التسجيل" value={format(new Date(partnerDetails.created_at), "yyyy/MM/dd")} />}
                </div>
              </div>

              {/* Bank accounts */}
              {partnerBankAccounts.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" />الحسابات البنكية</h4>
                  {partnerBankAccounts.map((b) => (
                    <div key={b.id} className="bg-muted/50 rounded-lg p-3 mb-2 text-xs space-y-1">
                      <p><span className="text-muted-foreground">البنك:</span> {b.bank_name}</p>
                      <p><span className="text-muted-foreground">اسم الحساب:</span> {b.account_name}</p>
                      <p><span className="text-muted-foreground">رقم الحساب:</span> {b.account_number}</p>
                      {b.iban && <p><span className="text-muted-foreground">IBAN:</span> {b.iban}</p>}
                      {b.is_primary && <Badge variant="secondary" className="text-xs">رئيسي</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-muted-foreground">{label}</span>
    <p className="font-medium">{value}</p>
  </div>
);

export default AdminTransactions;
