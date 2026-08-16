import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <span className="text-8xl font-bold text-gold">404</span>
      <h1 className="text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="max-w-md text-muted-foreground">
        عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
