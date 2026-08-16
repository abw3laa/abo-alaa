import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search, User, Heart, ShoppingBag, Menu } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LocaleToggle } from "@/components/layout/locale-toggle";

export async function Header() {
  const t = await getTranslations();
  const categories = await prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* شريط الإعلانات */}
      <div className="bg-primary py-2 text-center text-xs text-primary-foreground">
        شحن مجاني للطلبات فوق 500 ل.ت · دفع آمن · استرجاع خلال 14 يوماً
      </div>

      <div className="container flex h-16 items-center gap-4">
        {/* زر القائمة للجوال */}
        <button
          className="flex size-11 items-center justify-center rounded-md hover:bg-accent md:hidden"
          aria-label={t("common.menu")}
        >
          <Menu className="size-5" />
        </button>

        {/* الشعار */}
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex size-9 items-center justify-center rounded-md bg-gold text-gold-foreground">
            ع
          </span>
          <span className="text-lg">{t("common.siteName")}</span>
        </Link>

        {/* البحث */}
        <form
          action="/search"
          className="hidden flex-1 items-center md:flex"
          role="search"
        >
          <div className="relative w-full max-w-xl">
            <label htmlFor="site-search" className="sr-only">
              {t("common.search")}
            </label>
            <input
              id="site-search"
              name="q"
              type="search"
              placeholder={t("common.search")}
              className="h-10 w-full rounded-md border border-input bg-background pe-4 ps-10 text-sm focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </form>

        {/* الأيقونات */}
        <div className="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
          <Link
            href="/account"
            className="flex size-11 items-center justify-center rounded-md hover:bg-accent"
            aria-label={t("common.account")}
          >
            <User className="size-5" />
          </Link>
          <Link
            href="/account/wishlist"
            className="flex size-11 items-center justify-center rounded-md hover:bg-accent"
            aria-label={t("common.wishlist")}
          >
            <Heart className="size-5" />
          </Link>
          <Link
            href="/cart"
            className="relative flex size-11 items-center justify-center rounded-md hover:bg-accent"
            aria-label={t("common.cart")}
          >
            <ShoppingBag className="size-5" />
          </Link>
        </div>
      </div>

      {/* قائمة الأقسام */}
      <nav
        className="hidden border-t md:block"
        aria-label={t("nav.categories")}
      >
        <div className="container flex items-center gap-6 py-2 text-sm">
          <Link href="/" className="font-medium hover:text-gold">
            {t("nav.home")}
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="hover:text-gold"
            >
              {cat.name}
            </Link>
          ))}
          <Link href="/deals" className="text-destructive hover:underline">
            {t("nav.deals")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
