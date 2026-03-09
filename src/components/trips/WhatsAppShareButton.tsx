import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface WhatsAppShareButtonProps {
  tripData: {
    from_city: string;
    to_city: string;
    departure_time: string;
    price: number;
    supplier_name?: string;
    available_seats?: number;
  };
  className?: string;
}

const WhatsAppShareButton = ({ tripData, className }: WhatsAppShareButtonProps) => {
  const handleShare = () => {
    const date = new Date(tripData.departure_time);
    const dateStr = date.toLocaleDateString("ar-YE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = date.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" });

    const text = `🚌 رحلة عبر منصة وصل

📍 من: ${tripData.from_city}
📍 إلى: ${tripData.to_city}
📅 التاريخ: ${dateStr}
⏰ الوقت: ${timeStr}
💰 السعر: ${tripData.price.toLocaleString()} ر.ي
${tripData.supplier_name ? `🏢 المكتب: ${tripData.supplier_name}` : ""}
${tripData.available_seats ? `💺 المقاعد المتاحة: ${tripData.available_seats}` : ""}

🔗 احجز الآن عبر منصة وصل
${window.location.href}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className={`gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950 ${className || ""}`}
    >
      <MessageCircle className="w-4 h-4" />
      مشاركة عبر واتساب
    </Button>
  );
};

export default WhatsAppShareButton;
