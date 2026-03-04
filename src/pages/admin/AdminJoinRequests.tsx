import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, User, Building2, Truck, Car, Phone, Mail, CreditCard, Calendar, Loader2, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createAuditLog } from "@/lib/adminApi";

interface PendingUser {
  user_id: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  phone_secondary: string | null;
  logo_url: string | null;
  id_number: string | null;
  id_image_front: string | null;
  id_image_back: string | null;
  selfie_image: string | null;
  license_image: string | null;
  vehicle_type: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  vehicle_image: string | null;
  created_at: string;
  account_status: string | null;
  role?: string;
  email?: string;
}

const roleLabels: Record<string, string> = {
  supplier: "مورد",
  delivery_company: "شركة توصيل",
  driver: "سائق",
};

const roleIcons: Record<string, React.ReactNode> = {
  supplier: <Building2 className="w-4 h-4" />,
  delivery_company: <Truck className="w-4 h-4" />,
  driver: <Car className="w-4 h-4" />,
};

const AdminJoinRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    // Fetch profiles with account_status = 'pending' and their roles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("account_status", "pending")
      .order("created_at", { ascending: false });

    if (!profiles || profiles.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const userIds = profiles.map((p) => p.user_id);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", userIds);

    const roleMap = new Map((roles || []).map((r) => [r.user_id, r.role]));

    const enriched = profiles
      .map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) || "customer",
      }))
      .filter((p) => p.role !== "customer");

    setRequests(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (u: PendingUser) => {
    if (!user) return;
    setProcessing(true);
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "approved", is_verified: true, rejection_reason: null })
      .eq("user_id", u.user_id);

    if (error) { toast.error("فشل في الموافقة"); setProcessing(false); return; }

    // Send notification
    await supabase.from("notifications").insert({
      user_id: u.user_id,
      title: "تمت الموافقة على طلبك! 🎉",
      body: "مرحباً بك في منصة رحلاتي. يمكنك الآن البدء في استخدام المنصة.",
    });

    createAuditLog(user.id, "موافقة على طلب انضمام", "profile", u.user_id, { role: u.role });
    toast.success(`تمت الموافقة على ${u.full_name}`);
    setShowDetails(false);
    setProcessing(false);
    fetchRequests();
  };

  const handleReject = async () => {
    if (!user || !selectedUser) return;
    setProcessing(true);
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "rejected", rejection_reason: rejectionReason })
      .eq("user_id", selectedUser.user_id);

    if (error) { toast.error("فشل في الرفض"); setProcessing(false); return; }

    await supabase.from("notifications").insert({
      user_id: selectedUser.user_id,
      title: "تم رفض طلب الانضمام",
      body: `السبب: ${rejectionReason || "لم يتم ذكر السبب"}`,
    });

    createAuditLog(user.id, "رفض طلب انضمام", "profile", selectedUser.user_id, { role: selectedUser.role, reason: rejectionReason });
    toast.success("تم الرفض بنجاح");
    setShowReject(false);
    setShowDetails(false);
    setRejectionReason("");
    setProcessing(false);
    fetchRequests();
  };

  const filtered = activeTab === "all" ? requests : requests.filter((r) => r.role === activeTab);

  const ImageCard = ({ src, label }: { src: string | null; label: string }) => {
    if (!src) return null;
    return (
      <button
        onClick={() => setImagePreview(src)}
        className="group relative rounded-xl overflow-hidden border border-border hover:border-primary transition-colors"
      >
        <img src={src} alt={label} className="w-full h-28 object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye className="w-5 h-5 text-white" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
          <span className="text-[10px] text-white">{label}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">طلبات الانضمام</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">الكل ({requests.length})</TabsTrigger>
          <TabsTrigger value="supplier">الموردين ({requests.filter((r) => r.role === "supplier").length})</TabsTrigger>
          <TabsTrigger value="delivery_company">شركات التوصيل ({requests.filter((r) => r.role === "delivery_company").length})</TabsTrigger>
          <TabsTrigger value="driver">السائقين ({requests.filter((r) => r.role === "driver").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">لا توجد طلبات انضمام معلقة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((req) => (
            <Card key={req.user_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {req.logo_url ? (
                      <img src={req.logo_url} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      <div className="text-primary">{roleIcons[req.role || ""] || <User className="w-5 h-5" />}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{req.company_name || req.full_name}</h3>
                    {req.company_name && <p className="text-xs text-muted-foreground truncate">{req.full_name}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {roleLabels[req.role || ""] || req.role}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("ar-YE")}
                      </span>
                    </div>
                    {req.phone && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />{req.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Driver images indicators */}
                {req.role === "driver" && (
                  <div className="flex gap-1 mt-3">
                    {[req.id_image_front, req.id_image_back, req.selfie_image, req.license_image, req.vehicle_image].map((img, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[8px] ${img ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                      >
                        <Image className="w-3 h-3" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setSelectedUser(req); setShowDetails(true); }}>
                    <Eye className="w-3 h-3 ml-1" />التفاصيل
                  </Button>
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(req)} disabled={processing}>
                    <CheckCircle className="w-3 h-3 ml-1" />موافقة
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {roleIcons[selectedUser.role || ""]}
                  تفاصيل طلب {roleLabels[selectedUser.role || ""] || ""}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">الاسم:</span> <span className="font-medium">{selectedUser.full_name}</span></div>
                  {selectedUser.company_name && <div><span className="text-muted-foreground">الشركة:</span> <span className="font-medium">{selectedUser.company_name}</span></div>}
                  {selectedUser.phone && <div><span className="text-muted-foreground">الهاتف:</span> <span className="font-medium" dir="ltr">{selectedUser.phone}</span></div>}
                  {selectedUser.phone_secondary && <div><span className="text-muted-foreground">هاتف ثانوي:</span> <span className="font-medium" dir="ltr">{selectedUser.phone_secondary}</span></div>}
                  {selectedUser.id_number && <div><span className="text-muted-foreground">رقم الهوية:</span> <span className="font-medium" dir="ltr">{selectedUser.id_number}</span></div>}
                  <div><span className="text-muted-foreground">تاريخ التقديم:</span> <span className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString("ar-YE")}</span></div>
                </div>

                {/* Vehicle info for drivers */}
                {selectedUser.role === "driver" && (
                  <Card>
                    <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Car className="w-4 h-4" />بيانات المركبة</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2 text-sm py-0 pb-3">
                      <div><span className="text-muted-foreground">النوع:</span> {selectedUser.vehicle_type}</div>
                      <div><span className="text-muted-foreground">الموديل:</span> {selectedUser.vehicle_model}</div>
                      <div><span className="text-muted-foreground">اللون:</span> {selectedUser.vehicle_color}</div>
                      <div><span className="text-muted-foreground">اللوحة:</span> {selectedUser.vehicle_plate}</div>
                    </CardContent>
                  </Card>
                )}

                {/* Images */}
                <div>
                  <h4 className="text-sm font-bold mb-2">الصور والمستندات</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedUser.logo_url && <ImageCard src={selectedUser.logo_url} label="شعار الشركة" />}
                    <ImageCard src={selectedUser.id_image_front} label="البطاقة الأمامية" />
                    <ImageCard src={selectedUser.id_image_back} label="البطاقة الخلفية" />
                    <ImageCard src={selectedUser.selfie_image} label="صورة شخصية" />
                    <ImageCard src={selectedUser.license_image} label="رخصة القيادة" />
                    <ImageCard src={selectedUser.vehicle_image} label="صورة المركبة" />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2 pt-4">
                <Button variant="destructive" onClick={() => { setShowReject(true); }} disabled={processing}>
                  <XCircle className="w-4 h-4 ml-1" />رفض
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(selectedUser)} disabled={processing}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                  موافقة
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>سبب الرفض</DialogTitle></DialogHeader>
          <div>
            <Label>أدخل سبب الرفض (سيتم إرساله للمتقدم)</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="مثال: الصور غير واضحة..." className="mt-2" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <XCircle className="w-4 h-4 ml-1" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          {imagePreview && <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJoinRequests;
