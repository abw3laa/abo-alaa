"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "الأحدث" },
  { value: "priceLow", label: "السعر: من الأقل" },
  { value: "priceHigh", label: "السعر: من الأعلى" },
  { value: "bestSelling", label: "الأكثر مبيعاً" },
  { value: "topRated", label: "الأعلى تقييماً" },
  { value: "mostViewed", label: "الأكثر مشاهدة" },
];

export function ProductSort() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "newest";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-muted-foreground">
        ترتيب حسب
      </label>
      <select
        id="sort"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
