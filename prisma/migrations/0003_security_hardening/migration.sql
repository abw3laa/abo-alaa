-- 0003_security_hardening
-- ملاحظة: هذا الملف كُتب يدوياً لأنه لا توجد قاعدة بيانات حيّة متاحة أثناء
-- هذا التدقيق لتوليده عبر `prisma migrate dev`. يجب مراجعته وتشغيله على قاعدة
-- بيانات تطوير حقيقية (`npx prisma migrate dev`) قبل أي نشر إنتاجي، للتأكد
-- من تطابقه الكامل مع schema.prisma ومن عدم وجود Drift.
-- (استُخدم IF NOT EXISTS / نمط دفاعي مطابق لأسلوب migrations/0002_store_features)

-- ============================================================
-- 1) لقطة عنوان الشحن الثابتة على الطلب (Order Address Snapshot)
--    يحل مشكلة: عنوان الشحن في Checkout لم يكن يُحفظ فعلياً مع الطلب،
--    وكان الطلب سيتأثر لاحقاً إن عدّل العميل عنوانه المحفوظ.
-- ============================================================
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingFullName"   TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingPhone"      TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCountry"    TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCity"       TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingState"      TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingStreet"     TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingBuilding"   TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingPostalCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingNotes"      TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey"     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- ============================================================
-- 2) منع أكثر من مراجعة واحدة لكل مستخدم لكل منتج (P0: Review race condition)
--    ملاحظة تشغيلية: إن وُجدت مراجعات مكررة قديمة في بيانات حقيقية، هذا
--    الأمر سيفشل. شغّل الاستعلام التالي أولاً في بيئة حقيقية للتحقق:
--      SELECT "userId", "productId", COUNT(*) FROM "Review"
--      GROUP BY "userId", "productId" HAVING COUNT(*) > 1;
--    وعالج التكرار (دمج/حذف الأقدم) قبل تطبيق القيد أدناه.
--    ملاحظة تسمية: هذا الاسم مطابق لتسمية Prisma الافتراضية للقيد
--    @@unique([userId, productId]) على نموذج Review، بحيث يتعرّف عليه
--    `prisma migrate dev` لاحقاً كمطابق تماماً لما في schema.prisma
--    (وليس Drift). لا علاقة له بقيد WishlistItem المشابه اسمياً في
--    البنية لكنه على جدول مختلف تماماً (WishlistItem_userId_productId_key
--    كان موجوداً أصلاً قبل هذا التدقيق ولم يتأثر).
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_productId_key" ON "Review"("userId", "productId");

-- ============================================================
-- 3) منع مخزون سالب على مستوى قاعدة البيانات (Defense in depth) - حتى لو
--    وُجد خطأ منطقي مستقبلاً في التطبيق، لا يمكن للمخزون أن يصبح سالباً.
--    (Prisma schema.prisma لا يُمثّل CHECK constraints بشكل كامل بعد؛ هذا
--    القيد موجود في قاعدة البيانات فقط وقد يظهر كـ"drift" غير ضار عند
--    `prisma migrate dev` القادم - وهذا متوقع ومقصود، لا تُزِله.)
--    ملاحظة: لا يوجد IF NOT EXISTS مباشر لـADD CONSTRAINT في Postgres؛
--    نستخدم DO block دفاعياً لتفادي فشل إعادة التشغيل.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Inventory_quantity_non_negative'
  ) THEN
    ALTER TABLE "Inventory"
      ADD CONSTRAINT "Inventory_quantity_non_negative" CHECK ("quantity" >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Inventory_reserved_non_negative'
  ) THEN
    ALTER TABLE "Inventory"
      ADD CONSTRAINT "Inventory_reserved_non_negative" CHECK ("reserved" >= 0);
  END IF;
END $$;

-- ============================================================
-- 4) إبطال الجلسات (JWT) عند تغيير كلمة المرور / حظر / تغيير دور
-- ============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionsInvalidatedAt" TIMESTAMP(3);
