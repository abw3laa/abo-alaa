import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";
import { isStaff } from "@/lib/auth/permissions";

// إعدادات قابلة للتشغيل في Edge (middleware) دون Prisma
export const authConfig = {
  // الثقة بالمضيف مطلوبة على Vercel/الوكلاء العكسيين
  // نفعّلها صراحةً بدل الاعتماد على متغير البيئة فقط
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // تُعرّف في auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: UserRole }).role ?? "CUSTOMER";
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const role = auth?.user?.role as UserRole | undefined;
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // حماية لوحة التحكم على مستوى الخادم
      const isAdminArea =
        path.startsWith("/admin") || path.startsWith("/api/admin");
      if (isAdminArea) {
        return isLoggedIn && !!role && isStaff(role);
      }

      // حماية صفحات حساب العميل
      const isAccountArea = path.startsWith("/account");
      if (isAccountArea) {
        return isLoggedIn;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
