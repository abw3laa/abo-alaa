import { describe, it, expect } from "vitest";
import {
  roleHasPermission,
  isStaff,
  PERMISSIONS,
} from "@/lib/auth/permissions";

describe("permissions", () => {
  it("SUPER_ADMIN يملك كل الصلاحيات", () => {
    expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.PRODUCTS_DELETE)).toBe(
      true
    );
    expect(roleHasPermission("SUPER_ADMIN", PERMISSIONS.ROLES_MANAGE)).toBe(
      true
    );
  });

  it("CUSTOMER لا يملك صلاحيات إدارية", () => {
    expect(roleHasPermission("CUSTOMER", PERMISSIONS.PRODUCTS_CREATE)).toBe(
      false
    );
  });

  it("PRODUCT_MANAGER يملك صلاحية إنشاء المنتجات فقط لا الطلبات", () => {
    expect(
      roleHasPermission("PRODUCT_MANAGER", PERMISSIONS.PRODUCTS_CREATE)
    ).toBe(true);
    expect(
      roleHasPermission("PRODUCT_MANAGER", PERMISSIONS.ORDERS_REFUND)
    ).toBe(false);
  });

  it("isStaff تميّز الموظفين عن العملاء", () => {
    expect(isStaff("ADMIN")).toBe(true);
    expect(isStaff("CUSTOMER")).toBe(false);
  });
});
