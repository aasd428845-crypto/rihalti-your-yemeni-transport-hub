import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, Mail, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-hero-gradient flex items-center justify-center">
              <Bus className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-right">
               <div className="text-xl font-black text-foreground">وصل</div>
              <div className="text-xs text-muted-foreground">منصة النقل الذكية</div>
            </div>
          </a>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-black text-foreground">تحقق من بريدك</h1>
              <p className="text-sm text-muted-foreground">تم إرسال رابط إعادة تعيين كلمة المرور إلى <strong className="text-foreground">{email}</strong></p>
              <a href="/login" className="text-primary font-semibold hover:underline text-sm">العودة لتسجيل الدخول</a>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-foreground text-center mb-2">نسيت كلمة المرور؟</h1>
              <p className="text-sm text-muted-foreground text-center mb-6">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className="pr-10 h-11" required dir="ltr" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 bg-hero-gradient text-primary-foreground font-bold" disabled={loading}>
                  {loading ? "جاري الإرسال..." : "إرسال رابط إعادة التعيين"}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <a href="/login" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            العودة لتسجيل الدخول
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
