"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleCustomerBan } from "@/app/admin/customers/actions";

export function CustomerBanControl({
  userId,
  isBanned,
}: {
  userId: string;
  isBanned: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleCustomerBan(userId, !isBanned);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleToggle}
        disabled={pending}
        variant={isBanned ? "default" : "destructive"}
        className="w-full"
      >
        {pending
          ? "..."
          : isBanned
            ? "إلغاء الحظر وتفعيل الحساب"
            : "حظر الحساب"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
