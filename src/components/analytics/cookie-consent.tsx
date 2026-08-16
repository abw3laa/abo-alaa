"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "abo-alaa-cookie-consent";

/** موافقة ملفات تعريف الارتباط - لا تُشغّل التتبع قبل الموافقة */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
  }, []);

  function decide(value: "accepted" | "rejected") {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
    // إعلام بقية التطبيق بتغيّر الموافقة
    window.dispatchEvent(new Event("cookie-consent-change"));
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="موافقة ملفات تعريف الارتباط"
      className="fixed inset-x-0 bottom-0 z-[90] border-t bg-background p-4 shadow-lg"
    >
      <div className="container flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك. اطّلع على{" "}
          <Link href="/privacy" className="underline">
            سياسة الخصوصية
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => decide("rejected")}
          >
            رفض
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            موافق
          </Button>
        </div>
      </div>
    </div>
  );
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}
