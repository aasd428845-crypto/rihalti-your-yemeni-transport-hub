import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Phone, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type AuthMethod = "email" | "phone";

const LoginPage = () => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");

  // Email login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Phone OTP login
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) redirectByRole(session.user.id);
    });
  }, []);

  const redirectByRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      const r = data?.role;
      if (r === "admin") navigate("/admin", { replace: true });
      else if (r === "supplier") navigate("/supplier", { replace: true });
      else if (r === "delivery_company") navigate("/delivery", { replace: true });
      else if (r === "driver") navigate("/driver", { replace: true });
      else if (r === "delivery_driver") navigate("/delivery-driver", { replace: true });
      else navigate("/", { replace: true });
    } catch {
      navigate("/", { replace: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: "خطأ في تسجيل الدخول",
          description:
            error.message === "Invalid login credentials"
              ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
              : error.message === "Email not confirmed"
              ? "يرجى تأكيد بريدك الإلكتروني أولاً"
              : error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        toast({ title: "تم تسجيل الدخول بنجاح", description: "مرحباً بك في منصة التوصيل الذكي!" });
        await redirectByRole(data.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الاتصال بـ Google", variant: "destructive" });
    }
  };

  // ── Phone OTP ──
  const fullPhone = `+967${phoneNumber}`;

  const startCountdown = () => {
    setCountdown(60);
    const iv = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) { clearInterval(iv); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (phoneNumber.length !== 9) {
      toast({ title: "خطأ", description: "أدخل رقم هاتف يمني صحيح (9 أرقام)", variant: "destructive" });
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast({ title: "تعذّر إرسال الرمز", description: data.error || "فشل إرسال رمز التحقق", variant: "destructive", duration: 8000 });
      } else {
        setOtpSent(true);
        startCountdown();
        toast({ title: "تم الإرسال ✅", description: "تم إرسال رمز التحقق إلى هاتفك" });
      }
    } catch (err: any) {
      toast({ title: "خطأ في الاتصال", description: err?.message || "تعذّر الاتصال بخدمة التحقق", variant: "destructive" });
    }
    setPhoneLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "خطأ", description: "أدخل رمز التحقق المكون من 6 أرقام", variant: "destructive" });
      return;
    }
    setPhoneLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sms/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: fullPhone, code: otpCode }),
      });
      const payload = await res.json();
      if (!res.ok || payload.error) {
        toast({ title: "خطأ في التحقق", description: payload.error || "رمز غير صحيح", variant: "destructive", duration: 8000 });
        setPhoneLoading(false);
        return;
      }
      if (payload.success && payload.email && payload.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: payload.token_hash,
          type: "email",
        });
        if (verifyError) {
          toast({ title: "خطأ", description: "فشل في تسجيل الدخول. حاول مرة أخرى", variant: "destructive" });
          setPhoneLoading(false);
          return;
        }
        toast({ title: "تم تسجيل الدخول ✅", description: "جاري تحويلك..." });
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await redirectByRole(session.user.id);
        else navigate("/");
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل في التحقق", variant: "destructive" });
    }
    setPhoneLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center">
              <span className="text-2xl font-black text-white">و</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-foreground">وصل</div>
              <div className="text-xs text-muted-foreground">منصة التوصيل الذكي</div>
            </div>
          </a>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <h1 className="text-2xl font-black text-foreground text-center mb-2">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">أهلاً بعودتك! سجّل دخولك للمتابعة</p>

          {/* Google Login */}
          <Button variant="outline" className="w-full mb-4 h-11" onClick={handleGoogleLogin} type="button">
            <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            تسجيل الدخول بحساب Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">أو</span></div>
          </div>

          {/* Auth method tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden mb-5">
            <button
              onClick={() => setAuthMethod("email")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                authMethod === "email" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-4 h-4" />بريد إلكتروني
            </button>
            <button
              onClick={() => setAuthMethod("phone")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                authMethod === "phone" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="w-4 h-4" />رقم الهاتف
            </button>
          </div>

          {/* ── Email form ── */}
          {authMethod === "email" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
                <div className="relative mt-1">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com" className="pr-10 h-11" required dir="ltr" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
                  <a href="/forgot-password" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</a>
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="pr-10 pl-10 h-11" required dir="ltr" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit"
                className="w-full h-11 font-bold text-base bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الدخول...
                  </span>
                ) : "تسجيل الدخول"}
              </Button>
            </form>
          )}

          {/* ── Phone OTP form ── */}
          {authMethod === "phone" && (
            <div className="space-y-4">
              {!otpSent ? (
                <>
                  <div>
                    <Label>رقم الهاتف</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex items-center justify-center bg-muted rounded-md px-3 h-11 text-sm font-medium border border-input shrink-0" dir="ltr">
                        +967
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                          placeholder="7XX XXX XXX"
                          className="pr-10 h-11"
                          dir="ltr"
                          maxLength={9}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">أدخل رقمك بدون رمز البلد (+967)</p>
                  </div>
                  <Button
                    className="w-full h-11 bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                    onClick={handleSendOtp}
                    disabled={phoneLoading || phoneNumber.length !== 9}
                  >
                    {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    {phoneLoading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                  </Button>
                </>
              ) : (
                <>
                  <button onClick={() => { setOtpSent(false); setOtpCode(""); }}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />تغيير الرقم
                  </button>
                  <p className="text-sm text-muted-foreground text-center">
                    تم إرسال رمز التحقق إلى{" "}
                    <span className="font-bold text-foreground" dir="ltr">{fullPhone}</span>
                  </p>
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    className="w-full h-11 bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                    onClick={handleVerifyOtp}
                    disabled={phoneLoading || otpCode.length !== 6}
                  >
                    {phoneLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    {phoneLoading ? "جاري التحقق..." : "تأكيد الرمز"}
                  </Button>
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-xs text-muted-foreground">إعادة الإرسال بعد {countdown} ثانية</p>
                    ) : (
                      <button onClick={handleSendOtp} className="text-xs text-primary hover:underline" disabled={phoneLoading}>
                        إعادة إرسال الرمز
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            ليس لديك حساب؟{" "}
            <a href="/register" className="text-primary font-semibold hover:underline">إنشاء حساب جديد</a>
          </p>
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            العودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
