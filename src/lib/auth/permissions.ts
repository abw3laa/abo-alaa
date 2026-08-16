import { UserRole } from "@prisma/client";

// ==========================================
// تعريف الصلاحيات ومصفوفة الأدوار
// يُستخدم على الخادم لحماية كل العمليات الإدارية
// ==========================================

export const PERMISSIONS = {
  // المنتجات
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",
  // التصنيفات
  CATEGORIES_MANAGE: "categories.manage",
  // الطلبات
  ORDERS_VIEW: "orders.view",
  ORDERS_UPDATE: "orders.update",
  ORDERS_CANCEL: "orders.cancel",
  ORDERS_REFUND: "orders.refund",
  // العملاء
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  // الكوبونات والعروض
  COUPONS_MANAGE: "coupons.manage",
  // المحتوى
  CONTENT_MANAGE: "content.manage",
  // الشحن
  SHIPPING_MANAGE: "shipping.manage",
  // المدفوعات
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_MANAGE: "payments.manage",
  // التقارير والتحليلات
  ANALYTICS_VIEW: "analytics.view",
  // الإعدادات والصلاحيات
  SETTINGS_MANAGE: "settings.manage",
  ROLES_MANAGE: "roles.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL = Object.values(PERMISSIONS);

// مصفوفة الأدوار -> الصلاحيات الافتراضية
export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  SUPER_ADMIN: ALL,
  ADMIN: ALL.filter((p) => p !== PERMISSIONS.ROLES_MANAGE),
  MANAGER: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.COUPONS_MANAGE,
    PERMISSIONS.SHIPPING_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  PRODUCT_MANAGER: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.CATEGORIES_MANAGE,
  ],
  ORDER_MANAGER: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.ORDERS_REFUND,
    PERMISSIONS.SHIPPING_MANAGE,
    PERMISSIONS.CUSTOMERS_VIEW,
  ],
  CONTENT_EDITOR: [PERMISSIONS.CONTENT_MANAGE, PERMISSIONS.PRODUCTS_VIEW],
  CUSTOMER_SUPPORT: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.PRODUCTS_VIEW,
  ],
  ANALYST: [PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.PAYMENTS_VIEW],
  CUSTOMER: [],
};

const STAFF_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "PRODUCT_MANAGER",
  "ORDER_MANAGER",
  "CONTENT_EDITOR",
  "CUSTOMER_SUPPORT",
  "ANALYST",
];

/** هل الدور من موظفي المتجر (يملك دخول لوحة التحكم)؟ */
export function isStaff(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}

/** التحقق من امتلاك الدور لصلاحية معينة */
export function roleHasPermission(
  role: UserRole,
  permission: PermissionKey
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
