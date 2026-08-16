import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-gold text-gold-foreground">
              ع
            </span>
            أبو علاء
          </Link>
          <h1 className="mt-4 text-2xl font-bold">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أهلاً بعودتك، سجّل الدخول للمتابعة
          </p>
        </div>
        <Suspense fallback={<div className="h-64" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            className="font-medium text-gold hover:underline"
          >
            إنشاء حساب
          </Link>
        </p>
      </div>
    </div>
  );
}
