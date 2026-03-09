import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bus, Mail, Lock, User, Phone, Eye, EyeOff, Upload, Camera, Car, CreditCard, ArrowRight, AlertTriangle, CheckCircle, Loader2, Building2, Truck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/common/BackButton";

type InviteData = { email: string; role: string; token: string };

const VEHICLE_TYPES = [
  { value: "سيارة", label: "سيارة" },
  { value: "دراجة_نارية", label: "دراجة نارية" },
  { value: "حافلة_صغيرة", label: "حافلة صغيرة" },
  { value: "شاحنة", label: "شاحنة" },
];

const roleLabels: Record<string, string> = {
  supplier: "صاحب مكتب (شركة نقل)",
  delivery_company: "شركة توصيل",
  driver: "سائق (أجرة)",
};

const roleIcons: Record<string, React.ReactNode> = {
  supplier: <Building2 className="w-6 h-6" />,
  delivery_company: <Truck className="w-6 h-6" />,
  driver: <Car className="w-6 h-6" />,
};

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Common fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");

  // Supplier / Delivery fields
  const [companyName, setCompanyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Driver fields
  const [idNumber, setIdNumber] = useState("");
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [vehicleType, setVehicleType] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleImageFile, setVehicleImageFile] = useState<File | null>(null);

  // File previews
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) { setStatus("invalid"); return; }
    const { data, error } = await supabase
      .from("invitation_tokens")
      .select("email, role, token")
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data) { setStatus("invalid"); return; }
    setInviteData(data);
    setStatus("valid");
  };

  const handleFileChange = (file: File | null, setter: (f: File | null) => void, key: string) => {
    setter(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews((p) => ({ ...p, [key]: reader.result as string }));
      reader.readAsDataURL(file);
    } else {
      setPreviews((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const uploadFile = async (bucket: string, userId: string, fileName: string, file: File): Promise<string | null> => {
    const path = `${userId}/${fileName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

    if (password !== confirmPassword) {
      toast.error("كلمات المرور غير متطابقة");
      return;
    }
    if (password.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    // Driver-specific validation
    if (inviteData.role === "driver") {
      if (!idFrontFile || !idBackFile || !selfieFile || !licenseFile || !vehicleImageFile) {
        toast.error("جميع الصور مطلوبة للسائقين");
        return;
      }
      if (!idNumber || !vehicleType || !vehicleModel || !vehicleColor || !vehiclePlate) {
        toast.error("يرجى ملء جميع حقول السائق");
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            role: inviteData.role,
            phone,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("فشل إنشاء الحساب");

      const userId = authData.user.id;

      // 2. Upload files
      let logoUrl: string | null = null;
      let idFrontUrl: string | null = null;
      let idBackUrl: string | null = null;
      let selfieUrl: string | null = null;
      let licenseUrl: string | null = null;
      let vehicleImageUrl: string | null = null;

      if (logoFile) {
        logoUrl = await uploadFile("company-logos", userId, "logo.png", logoFile);
      }
      if (idFrontFile) {
        idFrontUrl = await uploadFile("id-images", userId, "front.jpg", idFrontFile);
      }
      if (idBackFile) {
        idBackUrl = await uploadFile("id-images", userId, "back.jpg", idBackFile);
      }
      if (selfieFile) {
        selfieUrl = await uploadFile("selfie-images", userId, "selfie.jpg", selfieFile);
      }
      if (licenseFile) {
        licenseUrl = await uploadFile("license-images", userId, "license.jpg", licenseFile);
      }
      if (vehicleImageFile) {
        vehicleImageUrl = await uploadFile("vehicle-images", userId, "vehicle.jpg", vehicleImageFile);
      }

      // 3. Wait a moment for the trigger to create profile, then update
      await new Promise((r) => setTimeout(r, 1500));

      const profileUpdate: Record<string, any> = {
        full_name: fullName,
        phone,
        phone_secondary: phoneSecondary || null,
        account_status: "pending",
        is_verified: false,
      };

      if (inviteData.role === "supplier" || inviteData.role === "delivery_company") {
        profileUpdate.company_name = companyName;
        if (logoUrl) profileUpdate.logo_url = logoUrl;
      }

      if (inviteData.role === "driver") {
        profileUpdate.id_number = idNumber;
        profileUpdate.id_image_front = idFrontUrl;
        profileUpdate.id_image_back = idBackUrl;
        profileUpdate.selfie_image = selfieUrl;
        profileUpdate.license_image = licenseUrl;
        profileUpdate.vehicle_type = vehicleType;
        profileUpdate.vehicle_model = vehicleModel;
        profileUpdate.vehicle_color = vehicleColor;
        profileUpdate.vehicle_plate = vehiclePlate;
        profileUpdate.vehicle_image = vehicleImageUrl;
      }

      await supabase.from("profiles").update(profileUpdate).eq("user_id", userId);

      // 4. Mark token as used
      await supabase
        .from("invitation_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", inviteData.token);

      // 5. Create notification for admin
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins && admins.length > 0) {
        const notifications = admins.map((a) => ({
          user_id: a.user_id,
          title: "طلب انضمام جديد",
          body: `قام ${fullName} بالتسجيل كـ ${roleLabels[inviteData.role] || inviteData.role}. يرجى مراجعة الطلب.`,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      toast.success("تم إنشاء حسابك بنجاح! سيتم مراجعة طلبك من قبل الإدارة.");
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "حدث خطأ أثناء إنشاء الحساب");
    } finally {
      setSubmitting(false);
    }
  };

  const FileUploadField = ({
    label,
    required,
    file,
    previewKey,
    onFileChange,
    accept = "image/*",
    icon: Icon = Upload,
  }: {
    label: string;
    required?: boolean;
    file: File | null;
    previewKey: string;
    onFileChange: (f: File | null) => void;
    accept?: string;
    icon?: any;
  }) => (
    <div>
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="mt-1">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors overflow-hidden">
          {previews[previewKey] ? (
            <img src={previews[previewKey]} alt={label} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Icon className="w-6 h-6" />
              <span className="text-xs">اضغط لرفع الصورة</span>
            </div>
          )}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              handleFileChange(f, onFileChange, previewKey);
            }}
          />
        </label>
      </div>
    </div>
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحقق من رابط الدعوة...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">رابط دعوة غير صالح</h2>
            <p className="text-muted-foreground mb-6">
              هذا الرابط غير صالح أو منتهي الصلاحية أو تم استخدامه مسبقاً.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inviteData) return null;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <BackButton />

        {/* Logo */}
        <div className="text-center mb-6">
          <a href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center">
              <Bus className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-foreground">رحلاتي</div>
              <div className="text-xs text-muted-foreground">المنصة اليمنية للنقل</div>
            </div>
          </a>
        </div>

        {/* Role badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            {roleIcons[inviteData.role]}
            <span>إنشاء حساب {roleLabels[inviteData.role] || inviteData.role}</span>
          </div>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">أكمل بياناتك</CardTitle>
            <p className="text-sm text-muted-foreground">
              سيتم مراجعة طلبك والموافقة عليه من قبل إدارة المنصة
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email (read-only) */}
              <div>
                <Label>البريد الإلكتروني</Label>
                <div className="relative mt-1">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={inviteData.email} readOnly className="pr-10 h-11 bg-muted/50" dir="ltr" />
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>كلمة المرور <span className="text-destructive">*</span></Label>
                  <div className="relative mt-1">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="6 أحرف على الأقل"
                      className="pr-10 pl-10 h-11"
                      required
                      minLength={6}
                      dir="ltr"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>تأكيد كلمة المرور <span className="text-destructive">*</span></Label>
                  <div className="relative mt-1">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      className="pr-10 h-11"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Name fields */}
              {(inviteData.role === "supplier" || inviteData.role === "delivery_company") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>{inviteData.role === "supplier" ? "اسم المكتب/الشركة" : "اسم شركة التوصيل"} <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1">
                      <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="اسم الشركة" className="pr-10 h-11" required />
                    </div>
                  </div>
                  <div>
                    <Label>{inviteData.role === "supplier" ? "اسم المسؤول" : "اسم صاحب الشركة"} <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الكامل" className="pr-10 h-11" required />
                    </div>
                  </div>
                </div>
              )}

              {inviteData.role === "driver" && (
                <div>
                  <Label>الاسم الكامل (كما في البطاقة) <span className="text-destructive">*</span></Label>
                  <div className="relative mt-1">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم الرباعي" className="pr-10 h-11" required />
                  </div>
                </div>
              )}

              {/* Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>رقم الهاتف الأول <span className="text-destructive">*</span></Label>
                  <div className="relative mt-1">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+967 7XX XXX XXX" className="pr-10 h-11" required dir="ltr" />
                  </div>
                </div>
                <div>
                  <Label>رقم الهاتف الثاني (اختياري)</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="tel" value={phoneSecondary} onChange={(e) => setPhoneSecondary(e.target.value)} placeholder="+967 7XX XXX XXX" className="pr-10 h-11" dir="ltr" />
                  </div>
                </div>
              </div>

              {/* Supplier/Delivery: Logo */}
              {(inviteData.role === "supplier" || inviteData.role === "delivery_company") && (
                <FileUploadField
                  label="شعار الشركة (اختياري)"
                  file={logoFile}
                  previewKey="logo"
                  onFileChange={(f) => handleFileChange(f, setLogoFile, "logo")}
                  icon={Building2}
                />
              )}

              {/* Driver-specific fields */}
              {inviteData.role === "driver" && (
                <>
                  <div className="border-t border-border pt-4">
                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      بيانات الهوية
                    </h3>
                  </div>

                  <div>
                    <Label>رقم الهوية الوطنية <span className="text-destructive">*</span></Label>
                    <div className="relative mt-1">
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="رقم الهوية" className="pr-10 h-11" required dir="ltr" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileUploadField label="صورة البطاقة الأمامية" required file={idFrontFile} previewKey="idFront" onFileChange={(f) => handleFileChange(f, setIdFrontFile, "idFront")} icon={CreditCard} />
                    <FileUploadField label="صورة البطاقة الخلفية" required file={idBackFile} previewKey="idBack" onFileChange={(f) => handleFileChange(f, setIdBackFile, "idBack")} icon={CreditCard} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FileUploadField label="صورة شخصية (سيلفي)" required file={selfieFile} previewKey="selfie" onFileChange={(f) => handleFileChange(f, setSelfieFile, "selfie")} icon={Camera} />
                    <FileUploadField label="صورة رخصة القيادة" required file={licenseFile} previewKey="license" onFileChange={(f) => handleFileChange(f, setLicenseFile, "license")} icon={CreditCard} />
                  </div>

                  <div className="border-t border-border pt-4">
                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      <Car className="w-5 h-5 text-primary" />
                      بيانات المركبة
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>نوع المركبة <span className="text-destructive">*</span></Label>
                      <Select value={vehicleType} onValueChange={setVehicleType} required>
                        <SelectTrigger className="mt-1 h-11"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>موديل المركبة <span className="text-destructive">*</span></Label>
                      <Input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="مثال: تويوتا كامري 2020" className="mt-1 h-11" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>لون المركبة <span className="text-destructive">*</span></Label>
                      <Input value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)} placeholder="مثال: أبيض" className="mt-1 h-11" required />
                    </div>
                    <div>
                      <Label>رقم اللوحة <span className="text-destructive">*</span></Label>
                      <Input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="مثال: 1234 أ ب ج" className="mt-1 h-11" required dir="ltr" />
                    </div>
                  </div>

                  <FileUploadField label="صورة المركبة" required file={vehicleImageFile} previewKey="vehicle" onFileChange={(f) => handleFileChange(f, setVehicleImageFile, "vehicle")} icon={Car} />
                </>
              )}

              {/* Submit */}
              <div className="pt-4 border-t border-border">
                <Button
                  type="submit"
                  className="w-full h-12 bg-hero-gradient text-primary-foreground font-bold hover:opacity-90 text-base"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري إنشاء الحساب...</>
                  ) : (
                    <><UserCheck className="w-5 h-5 ml-2" />إنشاء الحساب</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  بعد إنشاء الحساب، سيتم مراجعة بياناتك والموافقة عليها من قبل الإدارة
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InvitePage;
