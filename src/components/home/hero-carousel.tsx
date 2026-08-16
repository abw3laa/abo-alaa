"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  image: string;
  mobileImage: string | null;
  link: string | null;
  buttonText: string | null;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  fallbackTitle: string;
  fallbackSubtitle: string;
  fallbackBadge: string;
  shopNowLabel: string;
  viewDealsLabel: string;
}

export function HeroCarousel({
  slides,
  fallbackTitle,
  fallbackSubtitle,
  fallbackBadge,
  shopNowLabel,
  viewDealsLabel,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);
  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  // التبديل التلقائي كل 5 ثوانٍ
  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [count, next]);

  // لا توجد بانرات في قاعدة البيانات: نعرض البانر الافتراضي النصّي
  if (count === 0) {
    return (
      <section
        className="relative overflow-hidden bg-primary text-primary-foreground"
        aria-label={fallbackTitle}
      >
        <div className="container flex min-h-[420px] flex-col items-start justify-center gap-6 py-16">
          <span className="rounded-full bg-gold px-4 py-1 text-sm font-medium text-gold-foreground">
            {fallbackBadge}
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-6xl">
            {fallbackTitle}
          </h1>
          <p className="max-w-xl text-lg text-primary-foreground/80">
            {fallbackSubtitle}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="gold" size="lg">
              <Link href="/products">{shopNowLabel}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/deals">{viewDealsLabel}</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden"
      aria-roledescription="carousel"
    >
      <div className="relative min-h-[420px]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <Image
              src={slide.image}
              alt={slide.title ?? "بانر"}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="container relative flex min-h-[420px] flex-col items-start justify-center gap-5 py-16 text-white">
              {slide.subtitle && (
                <span className="rounded-full bg-gold px-4 py-1 text-sm font-medium text-gold-foreground">
                  {slide.subtitle}
                </span>
              )}
              {slide.title && (
                <h1 className="max-w-2xl text-4xl font-bold leading-tight drop-shadow md:text-6xl">
                  {slide.title}
                </h1>
              )}
              {(slide.link || slide.buttonText) && (
                <Button asChild variant="gold" size="lg">
                  <Link href={slide.link ?? "/products"}>
                    {slide.buttonText ?? shopNowLabel}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="السابق"
            className="absolute start-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black hover:bg-white"
          >
            <ChevronRight className="size-5 rtl:hidden" />
            <ChevronLeft className="size-5 ltr:hidden" />
          </button>
          <button
            onClick={next}
            aria-label="التالي"
            className="absolute end-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-black hover:bg-white"
          >
            <ChevronLeft className="size-5 rtl:hidden" />
            <ChevronRight className="size-5 ltr:hidden" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`الشريحة ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-gold" : "w-2 bg-white/60"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
