import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}

export function RatingStars({
  rating,
  count,
  size = "sm",
  className,
}: RatingStarsProps) {
  const starSize = size === "sm" ? "size-3.5" : "size-5";
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      aria-label={`التقييم ${rating.toFixed(1)} من 5`}
    >
      <div className="flex" role="img">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              starSize,
              i <= Math.round(rating)
                ? "fill-gold text-gold"
                : "fill-muted text-muted"
            )}
            aria-hidden="true"
          />
        ))}
      </div>
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
