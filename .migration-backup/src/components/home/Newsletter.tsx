import { useState } from "react";
import { Bell, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email });

      if (error) {
        if (error.code === "23505") {
          toast.info("هذا البريد مسجل بالفعل في النشرة البريدية");
        } else {
          toast.error("حدث خطأ، حاول مرة أخرى");
        }
      } else {
        toast.success("تم الاشتراك بنجاح! شكراً لك.");
        setEmail("");
      }
    } catch {
      toast.error("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-background via-primary/5 to-background border-t border-primary/10">
      <div className="container mx-auto px-4 max-w-[600px] text-center">
        <Bell className="w-9 h-9 text-primary-glow mx-auto mb-4" />
        <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">ابقَ على اطلاع دائم</h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed mb-7">
          اشترك في نشرتنا البريدية لتصلك آخر العروض والرحلات والتحديثات
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2.5 bg-card/80 rounded-[14px] p-1.5 pr-4 border border-primary/20">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="بريدك الإلكتروني..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-sm text-right placeholder:text-muted-foreground"
            required
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="bg-primary-gradient text-primary-foreground shadow-primary gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            اشترك
          </Button>
        </form>
      </div>
    </section>
  );
};

export default Newsletter;
