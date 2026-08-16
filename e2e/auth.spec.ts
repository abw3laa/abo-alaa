import { test, expect } from "@playwright/test";

// اختبار E2E لتسجيل الدخول - حالة البيانات الخاطئة
test.describe("تسجيل الدخول", () => {
  test("يعرض النموذج", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "تسجيل الدخول" })
    ).toBeVisible();
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
    await expect(page.getByLabel("كلمة المرور")).toBeVisible();
  });

  test("يعرض خطأ عند بيانات غير صحيحة", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill("wrong@example.com");
    await page.getByLabel("كلمة المرور").fill("wrongpassword");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page.getByText(/غير صحيحة/).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("رابط إنشاء حساب يعمل", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "إنشاء حساب" }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});
