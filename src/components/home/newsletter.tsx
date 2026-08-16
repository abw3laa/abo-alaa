"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Newsletter() {
  const t = useTranslations("home");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: ربط بـ API النشرة البريدية
    setSubmitted(true);
  }

  return (
    <section className="container">
      <div className="rounded-2xl bg-primary px-6 py-10 text-center text-primary-foreground md:px-12">
        <h2 className="text-2xl font-bold">{t("newsletterTitle")}</h2>
        <p className="mt-2 text-primary-foreground/80">
          {t("newsletterSubtitle")}
        </p>
        {submitted ? (
          <p className="mt-6 font-medium text-gold">شكراً لاشتراكك!</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              {t("newsletterPlaceholder")}
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletterPlaceholder")}
              className="h-11 flex-1 rounded-md border-0 px-4 text-foreground focus-visible:ring-2 focus-visible:ring-gold"
            />
            <Button type="submit" variant="gold" size="lg">
              {t("subscribe")}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
