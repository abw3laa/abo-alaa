import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "المدونة والمقالات" };

export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: { publishAt: "desc" },
  });

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-bold">المدونة والمقالات</h1>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">لا توجد مقالات بعد.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col overflow-hidden rounded-lg border bg-card"
            >
              <div className="flex aspect-video items-center justify-center bg-secondary text-muted-foreground">
                {post.category ?? "مقال"}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                {post.category && (
                  <span className="text-xs font-medium text-gold">
                    {post.category}
                  </span>
                )}
                <h2 className="font-semibold">
                  <Link href={`/blog/${post.slug}`} className="hover:text-gold">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
