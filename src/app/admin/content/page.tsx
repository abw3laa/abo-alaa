import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { FileText, Image as ImageIcon, HelpCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "منشور",
  DRAFT: "مسودة",
  ARCHIVED: "مؤرشف",
};

export default async function AdminContentPage() {
  await requirePermission(PERMISSIONS.CONTENT_MANAGE);

  const [posts, banners, faqs] = await Promise.all([
    prisma.blogPost.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">إدارة المحتوى</h2>

      {/* المدونة */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <FileText className="size-5 text-gold" /> المقالات ({posts.length})
        </h3>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50">
              <tr>
                <th className="p-3 text-start">العنوان</th>
                <th className="p-3 text-start">التصنيف</th>
                <th className="p-3 text-start">التاريخ</th>
                <th className="p-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.title}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.category ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatDate(p.createdAt, "ar")}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs">
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* البانرات */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <ImageIcon className="size-5 text-gold" /> البانرات ({banners.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {banners.map((b) => (
            <div key={b.id} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{b.title ?? "بانر"}</p>
              <p className="text-xs text-muted-foreground">{b.position}</p>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                  b.isActive
                    ? "bg-success/10 text-success"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {b.isActive ? "فعّال" : "متوقف"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* الأسئلة الشائعة */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <HelpCircle className="size-5 text-gold" /> الأسئلة الشائعة (
          {faqs.length})
        </h3>
        <div className="space-y-2">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-lg border bg-card p-3 text-sm">
              <p className="font-medium">{f.question}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
