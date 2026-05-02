import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface FavoriteHeartProps {
  entityType: "restaurant" | "menu_item";
  entityId: string;
  className?: string;
  size?: "sm" | "md";
}

const FavoriteHeart = ({ entityType, entityId, className = "", size = "sm" }: FavoriteHeartProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFav, setIsFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !entityId) return;
    (async () => {
      const { data } = await supabase
        .from("customer_favorites" as any)
        .select("id")
        .eq("customer_id", user.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();
      setIsFav(!!data);
    })();
  }, [user?.id, entityId, entityType]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast({ title: "سجّل الدخول لإضافة المفضلة", variant: "destructive" });
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !isFav;
    setIsFav(next);
    try {
      if (next) {
        const { error } = await supabase
          .from("customer_favorites" as any)
          .insert({ customer_id: user.id, entity_type: entityType, entity_id: entityId });
        if (error && !String(error.message).includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("customer_favorites" as any)
          .delete()
          .eq("customer_id", user.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId);
        if (error) throw error;
      }
    } catch (err: any) {
      setIsFav(!next);
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const sizeClass = size === "md" ? "w-10 h-10" : "w-8 h-8";
  const iconSize = size === "md" ? "w-5 h-5" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      className={`${sizeClass} rounded-full bg-white/95 dark:bg-background/95 backdrop-blur shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${className}`}
    >
      <Heart
        className={`${iconSize} transition-colors ${
          isFav ? "text-red-500 fill-red-500" : "text-foreground/60"
        }`}
      />
    </button>
  );
};

export default FavoriteHeart;
