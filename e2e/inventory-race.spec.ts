import { test, expect, request as playwrightRequest } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * اختبار Race Condition على المخزون (P0 - راجع SECURITY-HARDENING-REPORT.txt
 * F06). ننشئ منتجاً/متغيّراً بمخزون = 1 فقط، ثم نُطلق 100 طلب إنشاء طلب
 * متزامن تماماً (Promise.all) على نفس القطعة. النتيجة الصحيحة الوحيدة:
 * طلب واحد ناجح بالضبط، و99 مرفوضين، والمخزون النهائي = 0 (ليس سالباً).
 *
 * ** يتطلب DATABASE_URL صالحاً وخادماً يعمل فعلياً (playwright webServer) -
 * لم يُشغَّل هذا الاختبار فعلياً في بيئة التدقيق (لا قاعدة بيانات حيّة
 * متاحة هناك). راجعه وشغّله محلياً قبل الاعتماد عليه في CI. **
 */

const prisma = new PrismaClient();

let productId: string;
let variantId: string;
let inventoryId: string;

test.describe("سباق المخزون (Inventory Race Condition)", () => {
  test.beforeAll(async () => {
    const product = await prisma.product.create({
      data: {
        name: "منتج اختبار السباق",
        slug: `race-test-${Date.now()}`,
        description: "منتج مؤقت لاختبار E2E - يُحذف بعد الاختبار",
        price: 100,
        sku: `RACE-${Date.now()}`,
        status: "PUBLISHED",
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `${product.sku}-V1` },
    });
    variantId = variant.id;

    const inventory = await prisma.inventory.create({
      data: { variantId: variant.id, quantity: 1 },
    });
    inventoryId = inventory.id;
  });

  test.afterAll(async () => {
    // تنظيف بيانات الاختبار (لا نحذف أي طلبات أُنشئت فعلياً عمداً - نتركها
    // كدليل قابل للمراجعة اليدوية، لكن نُنظّف المنتج/المخزون التجريبي)
    await prisma.inventory.deleteMany({ where: { id: inventoryId } });
    await prisma.productVariant.deleteMany({ where: { id: variantId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.$disconnect();
  });

  test("100 طلب متزامن على مخزون=1 → نجاح واحد فقط بالضبط", async () => {
    const api = await playwrightRequest.newContext({
      baseURL: "http://localhost:3000",
    });

    const buildPayload = (i: number) => ({
      customer: {
        name: `عميل اختبار ${i}`,
        email: `race-test-${i}-${Date.now()}@example.com`,
        phone: "05000000" + String(i).padStart(2, "0"),
      },
      address: {
        country: "TR",
        city: "اسطنبول",
        street: "شارع الاختبار",
      },
      paymentMethod: "cod",
      items: [{ productId, variantId, quantity: 1 }],
    });

    // 100 طلب متزامن تماماً - لا انتظار تسلسلي بينها
    const responses = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        api.post("/api/orders", { data: buildPayload(i) })
      )
    );

    const successCount = responses.filter((r) => r.status() === 201).length;
    const rejectedCount = responses.filter((r) => r.status() === 400).length;

    // هذا هو التحقق الجوهري: يجب أن ينجح طلب واحد بالضبط لا أكثر
    expect(successCount).toBe(1);
    expect(rejectedCount).toBe(99);

    // والمخزون النهائي يجب أن يكون صفراً بالضبط - ليس سالباً (يتحقق من
    // القيد الذري نفسه، وليس فقط عدد النجاحات الظاهري)
    const finalInventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
    });
    expect(finalInventory?.quantity).toBe(0);

    await api.dispose();
  });
});
