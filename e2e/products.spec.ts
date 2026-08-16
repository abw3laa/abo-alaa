import { test, expect } from "@playwright/test";

// اختبارات E2E لصفحة المنتجات
test.describe("صفحة المنتجات", () => {
  test("تعرض شبكة المنتجات وعدد النتائج", async ({ page }) => {
    await page.goto("/products");
    await expect(
      page.getByRole("heading", { name: "جميع المنتجات" })
    ).toBeVisible();
    // عنصر منتج واحد على الأقل أو رسالة عدم وجود نتائج
    const hasProducts = await page
      .locator("article")
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page
      .getByText("لا توجد منتجات مطابقة")
      .isVisible()
      .catch(() => false);
    expect(hasProducts || hasEmpty).toBeTruthy();
  });

  test("الترتيب يحدّث الرابط", async ({ page }) => {
    await page.goto("/products");
    const sort = page.getByLabel("ترتيب حسب");
    if (await sort.isVisible().catch(() => false)) {
      await sort.selectOption("priceLow");
      await expect(page).toHaveURL(/sort=priceLow/);
    }
  });
});
