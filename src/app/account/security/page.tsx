import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/account/change-password-form";

export const metadata: Metadata = { title: "الأمان" };

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الأمان</h1>
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 font-semibold">تغيير كلمة المرور</h2>
        <ChangePasswordForm />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 font-semibold">المصادقة الثنائية</h2>
        <p className="text-sm text-muted-foreground">
          حماية إضافية لحسابك عبر رمز تحقق. (تُفعّل في تحديث قادم)
        </p>
      </div>
    </div>
  );
}
