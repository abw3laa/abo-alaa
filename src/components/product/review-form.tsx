"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/app/(shop)/products/[slug]/review-actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  productId,
  isLoggedIn,
}: {
  productId: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      setDone(true);
      router.refresh();
    }
  }, [state, router]);

  if (!isLoggedIn) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p className="text-muted-foreground">
          يجب{" "}
          <a href="/login" className="text-gold hover:underline">
            تسجيل الدخول
          </a>{" "}
          لكتابة مراجعة.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
        شكراً! تم نشر مراجعتك.
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="text-sm font-medium">قيّم هذا المنتج</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${i} نجوم`}
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                i <= (hover || rating)
                  ? "fill-gold text-gold"
                  : "fill-muted text-muted"
              )}
            />
          </button>
        ))}
      </div>

      <input
        name="title"
        placeholder="عنوان المراجعة (اختياري)"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <textarea
        name="comment"
        rows={3}
        placeholder="شاركنا رأيك في المنتج..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الإرسال..." : "إرسال المراجعة"}
      </Button>
    </form>
  );
}
