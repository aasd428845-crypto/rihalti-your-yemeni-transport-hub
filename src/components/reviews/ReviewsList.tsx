import { useEffect, useState } from "react";
import { Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
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

export const AverageRating = ({ revieweeId }: { revieweeId: string }) => {
  const [avg, setAvg] = useState<number>(0);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("reviews" as any)
        .select("rating")
        .eq("reviewee_id", revieweeId);
      if (data && data.length > 0) {
        const total = (data as any[]).reduce((s: number, r: any) => s + r.rating, 0);
        setAvg(total / data.length);
        setCount(data.length);
      }
    };
    load();
  }, [revieweeId]);

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <StarRating rating={Math.round(avg)} />
      <span className="text-sm font-medium">{avg.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
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
        .select("id, rating, comment, created_at, reviewer_id")
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
