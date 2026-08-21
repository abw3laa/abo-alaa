-- 0004_coupon_usage
-- نفس القيد المذكور في 0003: كُتب يدوياً (لا قاعدة بيانات حية متاحة أثناء
-- هذا التنفيذ)، ويجب التحقق منه عبر `prisma migrate dev` على بيئة تطوير
-- حقيقية قبل النشر.
--
-- يُضيف جدول تتبّع استخدام الكوبونات (CouponUsage) - ضروري لتطبيق
-- maxUsesPerUser بشكل موثوق يشمل طلبات الضيوف (عبر البريد الإلكتروني)
-- وليس فقط المستخدمين المسجَّلين، ولإتاحة سباق آمن (Race-safe) عبر
-- الاستهلاك الذرّي في coupons.ts.

CREATE TABLE IF NOT EXISTS "CouponUsage" (
    "id"         TEXT NOT NULL,
    "couponId"   TEXT NOT NULL,
    "userId"     TEXT,
    "guestEmail" TEXT,
    "orderId"    TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponUsage_orderId_key" ON "CouponUsage"("orderId");
CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_userId_idx" ON "CouponUsage"("couponId", "userId");
CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_guestEmail_idx" ON "CouponUsage"("couponId", "guestEmail");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CouponUsage_couponId_fkey'
  ) THEN
    ALTER TABLE "CouponUsage"
      ADD CONSTRAINT "CouponUsage_couponId_fkey"
      FOREIGN KEY ("couponId") REFERENCES "Coupon"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CouponUsage_userId_fkey'
  ) THEN
    ALTER TABLE "CouponUsage"
      ADD CONSTRAINT "CouponUsage_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CouponUsage_orderId_fkey'
  ) THEN
    ALTER TABLE "CouponUsage"
      ADD CONSTRAINT "CouponUsage_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
