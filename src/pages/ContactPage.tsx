import { useState } from "react";
import BackButton from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MessageCircle, MapPin, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ContactPage = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        user_id: user?.id || null,
        user_name: name.trim(),
        user_email: email.trim() || null,
        user_phone: phone.trim() || null,
        message: message.trim(),
      });
      if (error) throw error;
      toast({ title: "✅ تم استلام رسالتك بنجاح", description: "سوف نرد عليك في أقرب وقت ممكن" });
      setName(""); setEmail(""); setPhone(""); setMessage("");
    } catch {
      toast({ title: "حدث خطأ أثناء إرسال الرسالة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: Phone, label: "الهاتف", value: "+967 1 234 567", href: "tel:+9671234567" },
    { icon: MessageCircle, label: "واتساب", value: "+967 71 234 567", href: "https://wa.me/96771234567" },
    { icon: Mail, label: "البريد الإلكتروني", value: "support@rihlati.com", href: "mailto:support@rihlati.com" },
    { icon: MapPin, label: "العنوان", value: "صنعاء، اليمن", href: undefined },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">تواصل معنا</h1>
          <p className="text-muted-foreground mb-8">نسعد بتواصلك معنا. أرسل رسالتك وسنرد عليك في أقرب وقت.</p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-foreground">معلومات التواصل</h2>
              {contactInfo.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href?.startsWith("http") ? "_blank" : undefined}
                  rel={c.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`flex items-center gap-3 ${c.href ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className="font-medium text-foreground">{c.value}</p>
                  </div>
                </a>
              ))}
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>الاسم *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك" className="mt-1" required />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7XXXXXXXX" className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>الرسالة *</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." className="mt-1 min-h-[120px]" required />
                </div>
                <Button type="submit" className="w-full bg-hero-gradient text-primary-foreground font-bold hover:opacity-90" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                  إرسال الرسالة
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
