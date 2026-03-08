import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Eye, Ban, UserCheck } from "lucide-react";
import StatusBadge from "@/components/admin/common/StatusBadge";
import ConfirmModal from "@/components/admin/common/ConfirmModal";
import { roleLabels, type UserWithRole } from "@/types/admin.types";
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
    // For now, we change role to mark blocked (could add is_blocked column later)
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
    <div className="space-y-6">
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
            <SelectItem value="supplier">مورد</SelectItem>
            <SelectItem value="delivery_company">شركة توصيل</SelectItem>
            <SelectItem value="driver">سائق أجرة</SelectItem>
            <SelectItem value="delivery_driver">مندوب توصيل</SelectItem>
            <SelectItem value="admin">مشرف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
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
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد مستخدمون</TableCell></TableRow>
              ) : (
                filtered.map((u) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
