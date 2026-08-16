import { test, expect } from "@playwright/test";

// اختبارات E2E للصفحة الرئيسية والتنقّل الأساسي
test.describe("الصفحة الرئيسية", () => {
  test("تُحمّل وتعرض العناصر الأساسية", async ({ page }) => {
    await page.goto("/");
    // الشعار موجود
    await expect(page.getByText("أبو علاء").first()).toBeVisible();
    // زر تسوّق الآن
    await expect(
      page.getByRole("link", { name: /تسوق الآن/ }).first()
    ).toBeVisible();
  });

  test("الانتقال إلى صفحة المنتجات", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /تسوق الآن/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/products/);
  });

  test("رابط تخطّي المحتوى للوصولية", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("تخطّي إلى المحتوى");
    await expect(skipLink).toBeFocused();
  });
});
