"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "CONTENT_EDITOR",
  "CUSTOMER_SUPPORT",
  "ANALYST",
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      return;
    }

    // توجيه حسب الدور: الموظفون إلى لوحة التحكم، والعملاء إلى حسابهم
    let destination = callbackUrl;
    if (!destination) {
      const session = await getSession();
      const role = session?.user?.role;
      destination = role && STAFF_ROLES.includes(role) ? "/admin" : "/account";
    }

    setLoading(false);
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
