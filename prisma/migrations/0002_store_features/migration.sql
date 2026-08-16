-- AlterTable: نطاق الشحن للمنتج
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "shippingScope" TEXT NOT NULL DEFAULT 'both';

-- CreateTable: طرق الدفع التي يديرها الأدمن
CREATE TABLE IF NOT EXISTS "PaymentMethodOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentMethodOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMethodOption_code_key" ON "PaymentMethodOption"("code");

-- AlterTable: رابط تتبع الشحنة
ALTER TABLE "Shipment" ADD COLUMN IF NOT EXISTS "trackingUrl" TEXT;

-- AlterTable: أيقونة التصنيف (موجودة أصلاً في المخطط، نضمنها احتياطاً)
-- لا شيء إضافي مطلوب هنا

