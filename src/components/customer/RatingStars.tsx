import { Star } from "lucide-react";

interface RatingStarsProps {
  rating?: number | null;
  totalRatings?: number | null;
  size?: "xs" | "sm" | "md";
  showCount?: boolean;
  className?: string;
}

const RatingStars = ({
  rating,
  totalRatings,
  size = "sm",
  showCount = false,
  className = "",
}: RatingStarsProps) => {
  const r = Number(rating || 0);
  if (r <= 0) return null;

  const sizeClasses = {
    xs: "text-[10px] gap-0.5 px-1.5 py-0.5",
    sm: "text-[11px] gap-1 px-2 py-1",
    md: "text-sm gap-1.5 px-2.5 py-1.5",
  }[size];

  const iconSize = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-4 h-4",
  }[size];

  return (
    <span
      className={`inline-flex items-center bg-white/95 dark:bg-background/95 backdrop-blur rounded-lg font-bold shadow-sm ${sizeClasses} ${className}`}
    >
      <Star className={`${iconSize} text-yellow-500 fill-yellow-500`} />
      <span className="text-foreground">{r.toFixed(1)}</span>
      {showCount && totalRatings ? (
        <span className="text-muted-foreground font-normal">({totalRatings})</span>
      ) : null}
    </span>
  );
};

export default RatingStars;
