import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

// حساب رابط الموقع بأمان: متغير البيئة، أو رابط Vercel التلقائي، أو محلي
// نتعامل مع القيم الفارغة (وليس null فقط) لتفادي خطأ Invalid URL أثناء البناء
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

const siteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  title: {
    default: "أبو علاء | متجر الأزياء والمنتجات المتنوعة",
    template: "%s | أبو علاء",
  },
  description:
    "متجر أبو علاء الإلكتروني لبيع الملابس والأحذية والإكسسوارات والإلكترونيات ومنتجات المنزل بأفضل الأسعار مع شحن سريع ودفع آمن.",
  keywords: ["متجر", "ملابس", "أزياء", "تسوق", "أبو علاء"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "أبو علاء",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${arabicFont.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
