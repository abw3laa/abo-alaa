"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // تسجيل الخطأ لأدوات المراقبة (تُضاف لاحقاً)
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">حدث خطأ ما</h1>
      <p className="max-w-md text-muted-foreground">
        عذراً، واجهنا مشكلة غير متوقّعة. يمكنك المحاولة مرة أخرى.
      </p>
      <Button onClick={reset}>حاول مرة أخرى</Button>
    </div>
  );
}
