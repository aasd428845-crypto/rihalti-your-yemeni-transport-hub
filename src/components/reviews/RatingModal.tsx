import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Clock, Sparkles, MessageCircle } from "lucide-react";
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

const StarRow = ({
  label,
  icon: Icon,
  value,
  hovered,
  onHover,
  onLeave,
  onClick,
}: {
  label: string;
  icon: typeof Star;
  value: number;
  hovered: number;
  onHover: (v: number) => void;
  onLeave: () => void;
  onClick: (v: number) => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-1.5 min-w-[100px]">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => onHover(i)}
          onMouseLeave={onLeave}
          onClick={() => onClick(i)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              i <= (hovered || value)
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  </div>
);

const RatingModal = ({ open, onClose, revieweeId, revieweeName, entityType, entityId }: RatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [ratingPunctuality, setRatingPunctuality] = useState(0);
  const [hoveredPunctuality, setHoveredPunctuality] = useState(0);
  const [ratingCleanliness, setRatingCleanliness] = useState(0);
  const [hoveredCleanliness, setHoveredCleanliness] = useState(0);
  const [ratingCommunication, setRatingCommunication] = useState(0);
  const [hoveredCommunication, setHoveredCommunication] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast({ title: "يرجى اختيار التقييم العام", variant: "destructive" });
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
        rating_punctuality: ratingPunctuality || null,
        rating_cleanliness: ratingCleanliness || null,
        rating_communication: ratingCommunication || null,
        comment: comment.trim() || null,
      });
      if (error) throw error;

      // Award loyalty points for reviewing
      try {
        await supabase.rpc("add_loyalty_points", {
          _user_id: user.id,
          _points: 3,
          _description: "تقييم خدمة",
          _reference_id: entityId || null,
          _reference_type: entityType,
        });
      } catch {}

      toast({ title: "شكراً لتقييمك! ✨ (+3 نقاط ولاء)" });
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
          {/* Overall Stars */}
          <div>
            <p className="text-xs text-center text-muted-foreground mb-1">التقييم العام</p>
            <div className="flex gap-1 justify-center">
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
              <span className="text-sm font-medium text-muted-foreground text-center block mt-1">
                {labels[hovered || rating]}
              </span>
            )}
          </div>

          {/* Dimensional Ratings */}
          <div className="w-full space-y-2 p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-center mb-2">تقييمات تفصيلية (اختياري)</p>
            <StarRow
              label="الالتزام بالمواعيد"
              icon={Clock}
              value={ratingPunctuality}
              hovered={hoveredPunctuality}
              onHover={setHoveredPunctuality}
              onLeave={() => setHoveredPunctuality(0)}
              onClick={setRatingPunctuality}
            />
            <StarRow
              label="النظافة والجودة"
              icon={Sparkles}
              value={ratingCleanliness}
              hovered={hoveredCleanliness}
              onHover={setHoveredCleanliness}
              onLeave={() => setHoveredCleanliness(0)}
              onClick={setRatingCleanliness}
            />
            <StarRow
              label="التواصل والتعامل"
              icon={MessageCircle}
              value={ratingCommunication}
              hovered={hoveredCommunication}
              onHover={setHoveredCommunication}
              onLeave={() => setHoveredCommunication(0)}
              onClick={setRatingCommunication}
            />
          </div>

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
