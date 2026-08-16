import { cn } from "@/lib/utils";
import { formatPrice, calcDiscountPercent } from "@/lib/format";

interface PriceDisplayProps {
  price: number | string;
  compareAtPrice?: number | string | null;
  currency?: string;
  locale?: string;
  className?: string;
}

export function PriceDisplay({
  price,
  compareAtPrice,
  currency = "TRY",
  locale = "ar",
  className,
}: PriceDisplayProps) {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  const compareNum = compareAtPrice
    ? typeof compareAtPrice === "string"
      ? parseFloat(compareAtPrice)
      : compareAtPrice
    : null;
  const discount = calcDiscountPercent(priceNum, compareNum);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-bold text-primary">
        {formatPrice(priceNum, currency, locale)}
      </span>
      {compareNum && discount > 0 && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(compareNum, currency, locale)}
          </span>
          <span className="rounded bg-destructive px-1.5 py-0.5 text-xs font-medium text-destructive-foreground">
            -{discount}%
          </span>
        </>
      )}
    </div>
  );
}
