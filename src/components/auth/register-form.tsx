"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { registerSchema } from "@/lib/validations/auth";

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    // تحقق لحظي في الواجهة
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setServerError(json.error ?? "تعذّر إنشاء الحساب");
      setLoading(false);
      return;
    }

    // تسجيل دخول تلقائي بعد الإنشاء
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    router.push("/account");
    router.refresh();
  }

  const fields = [
    { name: "name", label: "الاسم الكامل", type: "text", autoComplete: "name" },
    {
      name: "email",
      label: "البريد الإلكتروني",
      type: "email",
      autoComplete: "email",
    },
    {
      name: "phone",
      label: "رقم الهاتف (اختياري)",
      type: "tel",
      autoComplete: "tel",
    },
    {
      name: "password",
      label: "كلمة المرور",
      type: "password",
      autoComplete: "new-password",
    },
    {
      name: "confirmPassword",
      label: "تأكيد كلمة المرور",
      type: "password",
      autoComplete: "new-password",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            aria-invalid={!!errors[f.name]}
            className="h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors[f.name] && (
            <p className="text-xs text-destructive">{errors[f.name]}</p>
          )}
        </div>
      ))}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "جارٍ الإنشاء..." : "إنشاء حساب"}
      </Button>
    </form>
  );
}
