import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    // ملاحظة: Content-Security-Policy لم يعد يُضبط هنا، بل في middleware.ts
    // لأنه يحتاج Nonce عشوائي لكل طلب (غير ممكن في headers() الثابتة هنا).
    // هذه الرؤوس الأخرى تبقى كخط أساس (Fallback) يغطي أيضاً مسارات لا يمر
    // بها middleware (كالأصول الثابتة المستثناة من matcher).
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // لا نرفع Source Maps إن غابت بيانات اعتماد Sentry (SENTRY_AUTH_TOKEN) -
  // هذا سلوك موثَّق من الحزمة نفسها (يتجاوز الخطوة بتحذير، لا يُفشل البناء)
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
