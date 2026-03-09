import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  revieweeId: string;
  revieweeName: string;
  entityType: "supplier" | "delivery" | "driver";
  entityId?: string;
}

const RatingModal = ({ open, onClose, revieweeId, revieweeName, entityType, entityId }: RatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast({ title: "يرجى اختيار تقييم", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews" as any).insert({
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        entity_type: entityType,
        entity_id: entityId || null,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast({ title: "شكراً لتقييمك! ✨" });
      onClose();
    } catch (err: any) {
      toast({ title: "خطأ في إرسال التقييم", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const labels = ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">قيّم الخدمة</DialogTitle>
          <DialogDescription className="text-center">
            كيف كانت تجربتك مع <span className="font-semibold text-foreground">{revieweeName}</span>؟
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Stars */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(i)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    i <= (hovered || rating)
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && (
            <span className="text-sm font-medium text-muted-foreground">
              {labels[hovered || rating]}
            </span>
          )}

          {/* Comment */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="أضف تعليقاً (اختياري)..."
            className="resize-none"
            rows={3}
          />

          <div className="flex gap-2 w-full">
            <Button onClick={handleSubmit} disabled={submitting || rating === 0} className="flex-1">
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

export default RatingModal;
