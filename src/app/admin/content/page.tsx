import { requirePermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { ContentManager } from "@/components/admin/content-manager";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requirePermission(PERMISSIONS.CONTENT_MANAGE);

  const [posts, banners, faqs] = await Promise.all([
    prisma.blogPost.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">إدارة المحتوى</h2>
      <ContentManager
        posts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          coverImage: p.coverImage,
          category: p.category,
          status: p.status,
        }))}
        banners={banners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle,
          image: b.image,
          link: b.link,
          buttonText: b.buttonText,
          position: b.position,
          sortOrder: b.sortOrder,
          isActive: b.isActive,
        }))}
        faqs={faqs.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          category: f.category,
          sortOrder: f.sortOrder,
          isActive: f.isActive,
        }))}
      />
    </div>
  );
}
