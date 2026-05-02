import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  orderId: string;
  restaurantId: string;
  restaurantName?: string;
  items: Array<{ menu_item_id: string; name: string; image_url?: string }>;
  onDone?: () => void;
}

const StarPicker = ({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) => {
  const [hover, setHover] = useState(0);
  const cls = size === "md" ? "w-7 h-7" : "w-5 h-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`${cls} transition-colors ${
              i <= (hover || value)
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const RestaurantOrderRatingDialog = ({
  open,
  onClose,
  orderId,
  restaurantId,
  restaurantName,
  items,
  onDone,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState("");
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setRestaurantRating(0);
      setRestaurantComment("");
      setItemRatings({});
    }
  }, [open]);

  // De-duplicate items by menu_item_id (cart might have multiple lines of same item)
  const uniqueItems = items.filter(
    (it, idx, arr) => it.menu_item_id && arr.findIndex((x) => x.menu_item_id === it.menu_item_id) === idx
  );

  const handleSubmit = async () => {
    if (!user) return;
    if (restaurantRating === 0) {
      toast({ title: "يرجى تقييم المطعم", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Insert restaurant review
      const { error: rErr } = await supabase
        .from("restaurant_reviews" as any)
        .insert({
          restaurant_id: restaurantId,
          customer_id: user.id,
          rating: restaurantRating,
          review: restaurantComment.trim() || null,
        });
      if (rErr) throw rErr;

      // Insert each item rating that was set (>0)
      const itemRows = Object.entries(itemRatings)
        .filter(([, v]) => v > 0)
        .map(([menu_item_id, rating]) => ({
          menu_item_id,
          customer_id: user.id,
          order_id: orderId,
          rating,
        }));
      if (itemRows.length > 0) {
        const { error: mErr } = await supabase
          .from("menu_item_reviews" as any)
          .insert(itemRows);
        if (mErr) throw mErr;
      }

      toast({ title: "شكراً لتقييمك! ✨" });
      onDone?.();
      onClose();
    } catch (err: any) {
      toast({ title: "خطأ في إرسال التقييم", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">قيّم تجربتك</DialogTitle>
          <DialogDescription className="text-center">
            ساعد الآخرين بتقييم {restaurantName ? <span className="font-bold text-foreground">{restaurantName}</span> : "المطعم"} والوجبات
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Restaurant rating */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold">تقييم المطعم</p>
            <div className="flex justify-center">
              <StarPicker value={restaurantRating} onChange={setRestaurantRating} size="md" />
            </div>
            <Textarea
              value={restaurantComment}
              onChange={(e) => setRestaurantComment(e.target.value)}
              placeholder="أضف تعليقاً عن المطعم (اختياري)..."
              className="resize-none text-sm"
              rows={2}
            />
          </div>

          {/* Item ratings */}
          {uniqueItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold">قيّم الوجبات</p>
              {uniqueItems.map((it) => (
                <div
                  key={it.menu_item_id}
                  className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl"
                >
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xl">
                      🍽️
                    </div>
                  )}
                  <p className="flex-1 text-sm font-semibold line-clamp-1">{it.name}</p>
                  <StarPicker
                    value={itemRatings[it.menu_item_id] || 0}
                    onChange={(v) =>
                      setItemRatings((prev) => ({ ...prev, [it.menu_item_id]: v }))
                    }
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || restaurantRating === 0}
              className="flex-1"
            >
              {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
            </Button>
            <Button variant="ghost" onClick={onClose} className="flex-1">
              لاحقاً
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantOrderRatingDialog;
