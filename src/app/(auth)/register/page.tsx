import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function RegisterPage() {
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
          <h1 className="mt-4 text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أنشئ حسابك للاستمتاع بتجربة تسوّق مميزة
          </p>
        </div>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-medium text-gold hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
