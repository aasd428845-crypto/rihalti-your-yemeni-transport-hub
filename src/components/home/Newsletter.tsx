import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Newsletter = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("تم الاشتراك بنجاح! شكراً لك.");
    setEmail("");
  };

  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto">
          <Mail className="w-10 h-10 mx-auto mb-4 text-accent" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">ابق على اطلاع بآخر العروض</h2>
          <p className="text-primary-foreground/80 mb-8">اشترك في نشرتنا البريدية لتصلك أحدث العروض والخدمات.</p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="بريدك الإلكتروني"
              className="flex-1 px-5 py-3 rounded-xl text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90 px-8">
              اشترك
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
