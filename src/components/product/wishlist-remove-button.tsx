"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { removeWishlistItem } from "@/app/account/wishlist/actions";

export function WishlistRemoveButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useState(false);

  function handleRemove() {
    start(async () => {
      const res = await removeWishlistItem(productId);
      if (res.ok) {
        setRemoved(true);
        router.refresh();
      }
    });
  }

  if (removed) return null;

  return (
    <button
      onClick={handleRemove}
      disabled={pending}
      aria-label="إزالة من المفضلة"
      className="absolute end-2 top-2 z-10 flex size-8 items-center justify-center rounded-full bg-background/90 text-destructive shadow hover:bg-background"
    >
      <X className="size-4" />
    </button>
  );
}
