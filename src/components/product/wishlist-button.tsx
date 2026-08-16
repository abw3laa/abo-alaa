"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlist } from "@/app/account/wishlist/actions";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  initialInWishlist = false,
  isLoggedIn,
  variant = "icon",
}: {
  productId: string;
  initialInWishlist?: boolean;
  isLoggedIn: boolean;
  variant?: "icon" | "button";
}) {
  const router = useRouter();
  const [inList, setInList] = useState(initialInWishlist);
  const [pending, start] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/products");
      return;
    }
    start(async () => {
      const res = await toggleWishlist(productId);
      if (res.ok) setInList(res.added);
    });
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleClick}
        disabled={pending}
        className={cn(
          "flex h-12 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors",
          inList
            ? "border-gold bg-gold/10 text-gold"
            : "border-input hover:bg-accent"
        )}
      >
        <Heart className={cn("size-5", inList && "fill-gold")} />
        {inList ? "في المفضلة" : "أضف إلى المفضلة"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={inList ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
      aria-pressed={inList}
      className={cn(
        "flex size-12 items-center justify-center rounded-md border transition-colors",
        inList
          ? "border-gold bg-gold/10 text-gold"
          : "border-input hover:bg-accent"
      )}
    >
      <Heart className={cn("size-5", inList && "fill-gold")} />
    </button>
  );
}
