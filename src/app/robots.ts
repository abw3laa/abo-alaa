import type { MetadataRoute } from "next";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // منع فهرسة المناطق الخاصة وصفحات الفلاتر
        disallow: ["/admin", "/account", "/api", "/checkout", "/cart", "/*?*"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
