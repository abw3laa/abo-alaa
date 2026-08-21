import type { Metadata } from "next";
import Link from "next/link";
import { requireUserOrRedirect } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product/product-card";
import { WishlistRemoveButton } from "@/components/product/wishlist-remove-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export const metadata: Metadata = { title: "المفضلة" };

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireUserOrRedirect();
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: {
      product: {
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="قائمة المفضلة فارغة"
        description="أضف المنتجات التي تعجبك لتجدها هنا"
        action={
          <Button asChild>
            <Link href="/products">تصفّح المنتجات</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المفضلة</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <WishlistRemoveButton productId={item.productId} />
            <ProductCard product={item.product} />
          </div>
        ))}
      </div>
    </div>
  );
}
