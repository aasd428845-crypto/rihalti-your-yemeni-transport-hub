import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Phone, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const CompleteProfilePage = () => {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/register");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast({ title: "خطأ", description: "الاسم الكامل مطلوب", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone_secondary: phoneSecondary || null,
        })
        .eq("user_id", user!.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (password && password.length >= 6) {
        const { error: passError } = await supabase.auth.updateUser({ password });
        if (passError) throw passError;
      }

      // Update user metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      toast({ title: "تم حفظ البيانات بنجاح!", description: "مرحباً بك في وصل" });
      // Force reload auth context to pick up updated profile
      window.location.href = "/";
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل في حفظ البيانات", variant: "destructive" });
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src="/icons/icon-192x192.png" alt="وصل" className="w-12 h-12 rounded-xl object-cover" />
            <div className="text-right">
              <div className="text-xl font-black text-foreground">وصل</div>
              <div className="text-xs text-muted-foreground">منصة النقل الذكية</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          <h1 className="text-2xl font-black text-foreground text-center mb-2">أكمل بياناتك</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            أدخل بياناتك لإكمال إنشاء حسابك
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="fullName">الاسم الرباعي <span className="text-destructive">*</span></Label>
              <div className="relative mt-1">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الأول والأب والجد واللقب"
                  className="pr-10 h-11"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">كلمة المرور (اختياري)</Label>
              <p className="text-xs text-muted-foreground mb-1">لتتمكن من تسجيل الدخول بالبريد وكلمة المرور لاحقاً</p>
              <div className="relative mt-1">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="pr-10 pl-10 h-11"
                  minLength={6}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="phoneSecondary">رقم هاتف ثانوي (اختياري)</Label>
              <div className="relative mt-1 flex gap-2">
                <div className="flex items-center justify-center bg-muted rounded-md px-3 h-11 text-sm font-medium text-muted-foreground border border-input shrink-0" dir="ltr">
                  +967
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phoneSecondary"
                    type="tel"
                    value={phoneSecondary}
                    onChange={(e) => setPhoneSecondary(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="7XX XXX XXX"
                    className="pr-10 h-11"
                    dir="ltr"
                    maxLength={9}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-hero-gradient text-primary-foreground font-bold hover:opacity-90"
              disabled={loading || !fullName.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {loading ? "جاري الحفظ..." : "حفظ وبدء الاستخدام"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
