import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Phone, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PhoneRegisterForm = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fullPhone = `+967${phoneNumber}`;

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (phoneNumber.length !== 9) {
      toast({ title: "خطأ", description: "أدخل رقم هاتف يمني صحيح (9 أرقام)", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: { phone_number: fullPhone },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      } else {
        setOtpSent(true);
        startCountdown();
        toast({ title: "تم الإرسال", description: "تم إرسال رمز التحقق إلى واتساب الخاص بك" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل في إرسال الرمز", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "خطأ", description: "أدخل رمز التحقق المكون من 6 أرقام", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { phone_number: fullPhone, code: otpCode },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data?.success && data?.email && data?.token_hash) {
        // Verify the magic link token to establish session
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "email",
        });

        if (verifyError) {
          toast({ title: "خطأ", description: "فشل في تسجيل الدخول. حاول مرة أخرى", variant: "destructive" });
          setLoading(false);
          return;
        }

        toast({ title: "تم التحقق بنجاح!", description: "جاري تحويلك..." });

        if (data.is_new_user) {
          navigate("/complete-profile");
        } else {
          navigate("/");
        }
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل في التحقق", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {!otpSent ? (
        <>
          <div>
            <Label htmlFor="phone">رقم الهاتف</Label>
            <div className="relative mt-1 flex gap-2">
              <div className="flex items-center justify-center bg-muted rounded-md px-3 h-11 text-sm font-medium text-muted-foreground border border-input shrink-0" dir="ltr">
                +967
              </div>
              <div className="relative flex-1">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
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
            <p className="text-xs text-muted-foreground mt-1">أدخل رقمك بدون رمز البلد</p>
          </div>

          <Button
            className="w-full h-11 bg-hero-gradient text-primary-foreground font-bold hover:opacity-90"
            onClick={handleSendOtp}
            disabled={loading || phoneNumber.length !== 9}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
          </Button>
        </>
      ) : (
        <>
          <button
            onClick={() => { setOtpSent(false); setOtpCode(""); }}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            تغيير الرقم
          </button>

          <p className="text-sm text-muted-foreground text-center">
            تم إرسال رمز التحقق عبر واتساب إلى <span className="font-bold text-foreground" dir="ltr">{fullPhone}</span>
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
            className="w-full h-11 bg-hero-gradient text-primary-foreground font-bold hover:opacity-90"
            onClick={handleVerifyOtp}
            disabled={loading || otpCode.length !== 6}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            {loading ? "جاري التحقق..." : "تأكيد الرمز"}
          </Button>

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-xs text-muted-foreground">إعادة الإرسال بعد {countdown} ثانية</p>
            ) : (
              <button onClick={handleSendOtp} className="text-xs text-primary hover:underline" disabled={loading}>
                إعادة إرسال الرمز
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PhoneRegisterForm;
