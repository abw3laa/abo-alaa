"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("currentPassword") ?? "");
    const newPassword = String(fd.get("newPassword") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("كلمتا المرور غير متطابقتين");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setLoading(false);
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("success");
      setMessage("تم تغيير كلمة المرور بنجاح");
      (e.target as HTMLFormElement).reset();
    } else {
      setStatus("error");
      setMessage(json.error ?? "تعذّر تغيير كلمة المرور");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4" noValidate>
      {status !== "idle" && (
        <div
          role="alert"
          className={`rounded-md px-4 py-3 text-sm ${
            status === "success"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {message}
        </div>
      )}
      {[
        { name: "currentPassword", label: "كلمة المرور الحالية" },
        { name: "newPassword", label: "كلمة المرور الجديدة" },
        { name: "confirmPassword", label: "تأكيد كلمة المرور" },
      ].map((f) => (
        <div key={f.name} className="space-y-1.5">
          <label htmlFor={f.name} className="text-sm font-medium">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type="password"
            required
            autoComplete={
              f.name === "currentPassword" ? "current-password" : "new-password"
            }
            className="h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ))}
      <Button type="submit" disabled={loading}>
        {loading ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
      </Button>
    </form>
  );
}
