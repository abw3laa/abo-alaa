import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// حماية المسارات على مستوى الخادم (لوحة التحكم وحساب العميل)
// اللغة تُدار عبر الكوكيز في src/i18n/request.ts لتبسيط RTL/LTR
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/api/admin/:path*"],
};
