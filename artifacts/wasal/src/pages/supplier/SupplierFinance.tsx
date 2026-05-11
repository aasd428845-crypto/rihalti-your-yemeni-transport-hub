import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupplierTransactions, createSupplierTransaction, getPlatformTransactions } from "@/lib/supplierApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { transactionTypeLabels } from "@/types/supplier.types";

const SupplierFinance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supplierTxns, setSupplierTxns] = useState<any[]>([]);
  const [platformTxns, setPlatformTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "external_income", amount: "", description: "", category: "", date: new Date().toISOString().slice(0, 10) });

  const loadData = async () => {
    if (!user?.id) return;
    const [stRes, ptRes] = await Promise.all([
      getSupplierTransactions(user.id),
      getPlatformTransactions(user.id),
    ]);
    setSupplierTxns(stRes.data || []);
    setPlatformTxns(ptRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user?.id]);

  const totalIncome = supplierTxns.filter(t => t.type === "platform_payout" || t.type === "external_income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = supplierTxns.filter(t => t.type === "external_expense").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const platformEarnings = platformTxns.reduce((s, t) => s + Number(t.partner_earning), 0);

  const handleAdd = async () => {
    if (!user?.id || !form.amount) return;
    const { error } = await createSupplierTransaction({
      supplier_id: user.id,
      type: form.type,
      amount: form.type === "external_expense" ? -Math.abs(Number(form.amount)) : Number(form.amount),
      description: form.description || null,
      category: form.category || null,
      date: form.date,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تمت إضافة المعاملة" });
      setShowForm(false);
      setForm({ type: "external_income", amount: "", description: "", category: "", date: new Date().toISOString().slice(0, 10) });
      loadData();
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">الإدارة المالية</h2>
        <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> إضافة معاملة</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">إجمالي الإيرادات</p><p className="text-lg font-bold">{totalIncome.toLocaleString()} ر.ي</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600"><TrendingDown className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">المصروفات</p><p className="text-lg font-bold">{totalExpenses.toLocaleString()} ر.ي</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><DollarSign className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">مستحقات المنصة</p><p className="text-lg font-bold">{platformEarnings.toLocaleString()} ر.ي</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="supplier" dir="rtl">
        <TabsList>
          <TabsTrigger value="supplier">معاملاتي</TabsTrigger>
          <TabsTrigger value="platform">معاملات المنصة</TabsTrigger>
        </TabsList>
        <TabsContent value="supplier">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierTxns.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">لا توجد معاملات</TableCell></TableRow>
                    ) : supplierTxns.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{transactionTypeLabels[txn.type] || txn.type}</TableCell>
                        <TableCell className={Number(txn.amount) >= 0 ? "text-green-600" : "text-destructive"}>
                          {Number(txn.amount).toLocaleString()} ر.ي
                        </TableCell>
                        <TableCell>{txn.description || "—"}</TableCell>
                        <TableCell>{txn.category || "—"}</TableCell>
                        <TableCell>{new Date(txn.date).toLocaleDateString("ar")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="platform">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ الكلي</TableHead>
                      <TableHead>عمولة المنصة</TableHead>
                      <TableHead>أرباحك</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {platformTxns.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد معاملات</TableCell></TableRow>
                    ) : platformTxns.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{txn.type}</TableCell>
                        <TableCell>{Number(txn.amount).toLocaleString()} ر.ي</TableCell>
                        <TableCell className="text-muted-foreground">{Number(txn.platform_fee).toLocaleString()} ر.ي</TableCell>
                        <TableCell className="text-green-600">{Number(txn.partner_earning).toLocaleString()} ر.ي</TableCell>
                        <TableCell>{txn.status}</TableCell>
                        <TableCell>{new Date(txn.created_at).toLocaleDateString("ar")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة معاملة خارجية</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_income">إيراد خارجي</SelectItem>
                  <SelectItem value="external_expense">مصروف خارجي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>المبلغ (ر.ي)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="إيجار، رواتب، فواتير..." /></div>
            <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleAdd}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierFinance;
