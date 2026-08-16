import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseParams: Record<string, string | undefined>;
}

export function Pagination({
  currentPage,
  totalPages,
  baseParams,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  function hrefFor(page: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (v) params.set(k, v);
    }
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="التنقل بين الصفحات"
    >
      {currentPage > 1 && (
        <Link
          href={hrefFor(currentPage - 1)}
          className="flex h-10 items-center rounded-md border px-3 text-sm hover:bg-accent"
          rel="prev"
        >
          السابق
        </Link>
      )}
      {start > 1 && (
        <>
          <PageLink href={hrefFor(1)} page={1} active={false} />
          {start > 2 && <span className="px-1 text-muted-foreground">…</span>}
        </>
      )}
      {pages.map((p) => (
        <PageLink
          key={p}
          href={hrefFor(p)}
          page={p}
          active={p === currentPage}
        />
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="px-1 text-muted-foreground">…</span>
          )}
          <PageLink
            href={hrefFor(totalPages)}
            page={totalPages}
            active={false}
          />
        </>
      )}
      {currentPage < totalPages && (
        <Link
          href={hrefFor(currentPage + 1)}
          className="flex h-10 items-center rounded-md border px-3 text-sm hover:bg-accent"
          rel="next"
        >
          التالي
        </Link>
      )}
    </nav>
  );
}

function PageLink({
  href,
  page,
  active,
}: {
  href: string;
  page: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex size-10 items-center justify-center rounded-md border text-sm ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent"
      }`}
    >
      {page}
    </Link>
  );
}
