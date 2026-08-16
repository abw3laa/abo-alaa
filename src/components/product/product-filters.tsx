"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterOption {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: FilterOption[];
  brands: FilterOption[];
  colors: { name: string; hex: string | null }[];
  sizes: string[];
}

export function ProductFilters({
  categories,
  brands,
  colors,
  sizes,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // تحديث الفلاتر مع حفظها في رابط الصفحة
  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || params.get(key) === value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasFilters = Array.from(searchParams.keys()).some((k) =>
    [
      "category",
      "brand",
      "color",
      "size",
      "gender",
      "onSale",
      "inStock",
      "minRating",
    ].includes(k)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">الفلاتر</h2>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="h-8 gap-1 text-destructive"
          >
            <X className="size-4" />
            حذف الكل
          </Button>
        )}
      </div>

      {/* التصنيفات */}
      <FilterGroup title="القسم">
        <div className="space-y-1">
          {categories
            .filter((c) => c.slug)
            .slice(0, 12)
            .map((cat) => (
              <FilterButton
                key={cat.id}
                active={searchParams.get("category") === cat.slug}
                onClick={() => setParam("category", cat.slug)}
              >
                {cat.name}
              </FilterButton>
            ))}
        </div>
      </FilterGroup>

      {/* الماركات */}
      {brands.length > 0 && (
        <FilterGroup title="الماركة">
          <div className="space-y-1">
            {brands.map((brand) => (
              <FilterButton
                key={brand.id}
                active={searchParams.get("brand") === brand.slug}
                onClick={() => setParam("brand", brand.slug)}
              >
                {brand.name}
              </FilterButton>
            ))}
          </div>
        </FilterGroup>
      )}

      {/* الألوان - نص + لون معاً للوصولية */}
      {colors.length > 0 && (
        <FilterGroup title="اللون">
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const active = searchParams.get("color") === color.name;
              return (
                <button
                  key={color.name}
                  onClick={() => setParam("color", color.name)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                    active
                      ? "border-gold bg-gold/10 font-medium"
                      : "hover:border-gold"
                  }`}
                >
                  <span
                    className="size-3 rounded-full border"
                    style={{ backgroundColor: color.hex ?? "#ccc" }}
                    aria-hidden="true"
                  />
                  {color.name}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* المقاسات */}
      {sizes.length > 0 && (
        <FilterGroup title="المقاس">
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const active = searchParams.get("size") === size;
              return (
                <button
                  key={size}
                  onClick={() => setParam("size", size)}
                  aria-pressed={active}
                  className={`min-w-11 rounded-md border px-3 py-2 text-sm ${
                    active
                      ? "border-gold bg-gold/10 font-medium"
                      : "hover:border-gold"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* خيارات إضافية */}
      <FilterGroup title="خيارات">
        <div className="space-y-1">
          <FilterButton
            active={searchParams.get("onSale") === "1"}
            onClick={() => setParam("onSale", "1")}
          >
            المخفّضة فقط
          </FilterButton>
          <FilterButton
            active={searchParams.get("inStock") === "1"}
            onClick={() => setParam("inStock", "1")}
          >
            المتوفرة فقط
          </FilterButton>
        </div>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {children}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`block w-full rounded-md px-3 py-2 text-start text-sm ${
        active ? "bg-gold/10 font-medium text-gold" : "hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
