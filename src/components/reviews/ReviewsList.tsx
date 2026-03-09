import { useEffect, useState } from "react";
import { Star, User, Clock, Sparkles, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface Review {
  id: string;
  rating: number;
  rating_punctuality: number | null;
  rating_cleanliness: number | null;
  rating_communication: number | null;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
}

interface ReviewsListProps {
  revieweeId: string;
  limit?: number;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${
          i <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const MiniRating = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: number }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <Icon className="w-3 h-3 text-muted-foreground" />
    <span className="text-muted-foreground">{label}</span>
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-2.5 h-2.5 ${i <= value ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
  </div>
);

export const AverageRating = ({ revieweeId }: { revieweeId: string }) => {
  const [avg, setAvg] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [dimensions, setDimensions] = useState({ punctuality: 0, cleanliness: 0, communication: 0 });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reviews" as any)
        .select("rating, rating_punctuality, rating_cleanliness, rating_communication")
        .eq("reviewee_id", revieweeId);
      if (data && data.length > 0) {
        const items = data as any[];
        const total = items.reduce((s: number, r: any) => s + r.rating, 0);
        setAvg(total / items.length);
        setCount(items.length);

        // Calculate dimensional averages
        const withPunct = items.filter((r: any) => r.rating_punctuality);
        const withClean = items.filter((r: any) => r.rating_cleanliness);
        const withComm = items.filter((r: any) => r.rating_communication);
        setDimensions({
          punctuality: withPunct.length > 0 ? withPunct.reduce((s: number, r: any) => s + r.rating_punctuality, 0) / withPunct.length : 0,
          cleanliness: withClean.length > 0 ? withClean.reduce((s: number, r: any) => s + r.rating_cleanliness, 0) / withClean.length : 0,
          communication: withComm.length > 0 ? withComm.reduce((s: number, r: any) => s + r.rating_communication, 0) / withComm.length : 0,
        });
      }
    };
    load();
  }, [revieweeId]);

  if (count === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <StarRating rating={Math.round(avg)} />
        <span className="text-sm font-medium">{avg.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">({count})</span>
      </div>
      {(dimensions.punctuality > 0 || dimensions.cleanliness > 0 || dimensions.communication > 0) && (
        <div className="space-y-1">
          {dimensions.punctuality > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground w-20">المواعيد</span>
              <Progress value={dimensions.punctuality * 20} className="h-1.5 flex-1" />
              <span className="text-muted-foreground w-6">{dimensions.punctuality.toFixed(1)}</span>
            </div>
          )}
          {dimensions.cleanliness > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground w-20">النظافة</span>
              <Progress value={dimensions.cleanliness * 20} className="h-1.5 flex-1" />
              <span className="text-muted-foreground w-6">{dimensions.cleanliness.toFixed(1)}</span>
            </div>
          )}
          {dimensions.communication > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <MessageCircle className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground w-20">التواصل</span>
              <Progress value={dimensions.communication * 20} className="h-1.5 flex-1" />
              <span className="text-muted-foreground w-6">{dimensions.communication.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ReviewsList = ({ revieweeId, limit = 5 }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reviews" as any)
        .select("id, rating, rating_punctuality, rating_cleanliness, rating_communication, comment, created_at, reviewer_id")
        .eq("reviewee_id", revieweeId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (data && data.length > 0) {
        const reviewerIds = [...new Set((data as any[]).map((r: any) => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", reviewerIds);

        const nameMap = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));

        setReviews(
          (data as any[]).map((r: any) => ({
            id: r.id,
            rating: r.rating,
            rating_punctuality: r.rating_punctuality,
            rating_cleanliness: r.rating_cleanliness,
            rating_communication: r.rating_communication,
            comment: r.comment,
            created_at: r.created_at,
            reviewer_name: nameMap.get(r.reviewer_id) || "مستخدم",
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, [revieweeId, limit]);

  if (loading) {
    return <div className="animate-pulse space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}</div>;
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">لا توجد تقييمات بعد</p>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{review.reviewer_name}</span>
            </div>
            <StarRating rating={review.rating} />
          </div>

          {/* Dimensional ratings */}
          {(review.rating_punctuality || review.rating_cleanliness || review.rating_communication) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mr-9 mb-1.5">
              {review.rating_punctuality && (
                <MiniRating icon={Clock} label="المواعيد" value={review.rating_punctuality} />
              )}
              {review.rating_cleanliness && (
                <MiniRating icon={Sparkles} label="النظافة" value={review.rating_cleanliness} />
              )}
              {review.rating_communication && (
                <MiniRating icon={MessageCircle} label="التواصل" value={review.rating_communication} />
              )}
            </div>
          )}

          {review.comment && (
            <p className="text-sm text-muted-foreground mr-9">{review.comment}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mr-9 mt-1">
            {new Date(review.created_at).toLocaleDateString("ar-YE")}
          </p>
        </div>
      ))}
    </div>
  );
};

export default ReviewsList;
