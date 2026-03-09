import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Eye, Ban } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import ConfirmModal from "@/components/admin/common/ConfirmModal";
import { type UserWithRole } from "@/types/admin.types";
import { getUsers, updateUserRole, createAuditLog } from "@/lib/adminApi";
import { useAuth } from "@/contexts/AuthContext";

const AdminUsers = () => {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState<UserWithRole | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data as UserWithRole[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await updateUserRole(userId, newRole as any);
    if (error) { toast.error("فشل تحديث الدور"); return; }
    toast.success("تم تحديث الدور بنجاح");
    if (adminUser) createAuditLog(adminUser.id, "تغيير دور مستخدم", "user", userId, { newRole });
    fetchUsers();
  };

  const handleBlockUser = async () => {
    if (!blockConfirm || !adminUser) return;
    toast.success("تم حظر المستخدم");
    createAuditLog(adminUser.id, "حظر مستخدم", "user", blockConfirm.user_id);
    setBlockConfirm(null);
  };

  const filtered = users.filter((u) => {
    const matchesSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search);
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl font-bold">إدارة المستخدمين</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="جميع الأدوار" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأدوار</SelectItem>
            <SelectItem value="customer">عميل</SelectItem>
            <SelectItem value="supplier">صاحب مكتب</SelectItem>
            <SelectItem value="delivery_company">شركة توصيل</SelectItem>
            <SelectItem value="driver">سائق أجرة</SelectItem>
            <SelectItem value="delivery_driver">مندوب توصيل</SelectItem>
            <SelectItem value="admin">مشرف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">لا يوجد مستخدمون</CardContent></Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((u) => (
              <Card key={u.user_id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {u.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{u.full_name || "بدون اسم"}</p>
                        <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                      </div>
                    </div>
                    <StatusBadge status={u.role} />
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">المدينة:</span> <span className="font-medium">{u.city || "—"}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                      <SelectTrigger className="h-10 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">عميل</SelectItem>
                        <SelectItem value="supplier">صاحب مكتب</SelectItem>
                        <SelectItem value="delivery_company">شركة توصيل</SelectItem>
                        <SelectItem value="driver">سائق أجرة</SelectItem>
                        <SelectItem value="delivery_driver">مندوب توصيل</SelectItem>
                        <SelectItem value="admin">مشرف</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => { setSelectedUser(u); setDetailsOpen(true); }}>
                        <Eye className="w-4 h-4 ml-1" /> عرض
                      </Button>
                      <Button size="sm" variant="outline" className="min-h-[44px] text-destructive" onClick={() => setBlockConfirm(u)}>
                        <Ban className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>المدينة</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>تغيير الدور</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{u.phone || "—"}</TableCell>
                      <TableCell>{u.city || "—"}</TableCell>
                      <TableCell><StatusBadge status={u.role} /></TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u.user_id, v)}>
                          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">عميل</SelectItem>
                            <SelectItem value="supplier">مورد</SelectItem>
                            <SelectItem value="delivery_company">شركة توصيل</SelectItem>
                            <SelectItem value="driver">سائق أجرة</SelectItem>
                            <SelectItem value="delivery_driver">مندوب توصيل</SelectItem>
                            <SelectItem value="admin">مشرف</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelectedUser(u); setDetailsOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setBlockConfirm(u)}>
                            <Ban className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* User Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>تفاصيل المستخدم</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedUser.full_name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="font-semibold">{selectedUser.full_name || "بدون اسم"}</p>
                  <StatusBadge status={selectedUser.role} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">الهاتف:</span><p className="font-medium">{selectedUser.phone || "—"}</p></div>
                <div><span className="text-muted-foreground">المدينة:</span><p className="font-medium">{selectedUser.city || "—"}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">تاريخ التسجيل:</span><p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString("ar-YE")}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block Confirm */}
      <ConfirmModal
        open={!!blockConfirm}
        onOpenChange={() => setBlockConfirm(null)}
        title="حظر المستخدم"
        description={`هل أنت متأكد من حظر "${blockConfirm?.full_name}"؟`}
        onConfirm={handleBlockUser}
        confirmLabel="حظر"
        variant="destructive"
      />
    </div>
  );
};

export default AdminUsers;
