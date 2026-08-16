"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

const LOCALES = [
  { code: "ar", label: "العربية" },
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

export function LocaleToggle() {
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(code: string) {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-md hover:bg-accent"
        aria-label="تبديل اللغة"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Globe className="size-5" />
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-36 rounded-md border bg-background p-1 shadow-md">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent"
            >
              {l.label}
              {locale === l.code && <Check className="size-4 text-gold" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
