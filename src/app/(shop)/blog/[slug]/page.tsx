import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { sanitizeContentHtml } from "@/lib/security/sanitize-html";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      seoTitle: true,
      seoDescription: true,
      excerpt: true,
    },
  });
  if (!post) return { title: "المقال غير موجود" };
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
  });
  if (!post) notFound();

  return (
    <article className="container max-w-3xl py-8">
      {post.category && (
        <span className="text-sm font-medium text-gold">{post.category}</span>
      )}
      <h1 className="mt-2 text-3xl font-bold">{post.title}</h1>
      {post.publishAt && (
        <p className="mt-2 text-sm text-muted-foreground">
          {formatDate(post.publishAt, "ar")}
        </p>
      )}
      <div
        className="prose mt-6 max-w-none text-foreground"
        // تنظيف مستقل هنا أيضاً (وليس فقط عند الحفظ) كطبقة دفاع ثانية،
        // احتياطاً لأي بيانات قديمة أو مسار كتابة مستقبلي غير مُنظَّف
        dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(post.content) }}
      />
    </article>
  );
}
