"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/admin/products/actions";

export function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.ok) {
        router.refresh();
      } else {
        alert(result.error);
      }
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <button
          onClick={handleDelete}
          disabled={pending}
          className="font-medium text-destructive hover:underline"
        >
          {pending ? "..." : "تأكيد"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-muted-foreground hover:underline"
        >
          إلغاء
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center text-destructive hover:underline"
      aria-label={`حذف ${name}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
