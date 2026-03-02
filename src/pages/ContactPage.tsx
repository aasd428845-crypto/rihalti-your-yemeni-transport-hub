import { useState } from "react";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import BackButton from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MessageCircle, MapPin } from "lucide-react";

const ContactPage = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    toast({ title: "تم إرسال رسالتك بنجاح", description: "سنتواصل معك في أقرب وقت" });
    setName(""); setEmail(""); setMessage("");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <BackButton />
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">تواصل معنا</h1>
          <p className="text-muted-foreground mb-8">نسعد بتواصلك معنا. أرسل رسالتك وسنرد عليك في أقرب وقت.</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-foreground">معلومات التواصل</h2>
              {[
                { icon: Phone, label: "الهاتف", value: "+967 1 234 567" },
                { icon: MessageCircle, label: "واتساب", value: "+967 71 234 567" },
                { icon: Mail, label: "البريد الإلكتروني", value: "support@rihlati.com" },
                { icon: MapPin, label: "العنوان", value: "صنعاء، اليمن" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className="font-medium text-foreground">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Form */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>الاسم *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك" className="mt-1" required />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" className="mt-1" dir="ltr" />
                </div>
                <div>
                  <Label>الرسالة *</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." className="mt-1 min-h-[120px]" required />
                </div>
                <Button type="submit" className="w-full bg-hero-gradient text-primary-foreground font-bold hover:opacity-90">إرسال الرسالة</Button>
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
