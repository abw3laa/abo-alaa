"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  updateRolePermissions,
  updateUserRole,
} from "@/app/admin/roles/actions";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "مدير عام",
  ADMIN: "مدير",
  MANAGER: "مشرف",
  PRODUCT_MANAGER: "مدير منتجات",
  ORDER_MANAGER: "مدير طلبات",
  CONTENT_EDITOR: "محرّر محتوى",
  CUSTOMER_SUPPORT: "دعم العملاء",
  ANALYST: "محلّل",
};

interface RoleData {
  role: string;
  permissions: string[];
  userCount: number;
}

function RoleCard({
  data,
  allPermissions,
  permLabels,
}: {
  data: RoleData;
  allPermissions: string[];
  permLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(data.permissions)
  );
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const isSuperAdmin = data.role === "SUPER_ADMIN";

  function toggle(perm: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  function save() {
    setMessage(null);
    start(async () => {
      const res = await updateRolePermissions(data.role, Array.from(selected));
      setMessage(res.ok ? "تم حفظ الصلاحيات" : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{ROLE_LABELS[data.role] ?? data.role}</h3>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs">
          {data.userCount} مستخدم
        </span>
      </div>

      {isSuperAdmin ? (
        <p className="text-sm text-muted-foreground">
          المدير العام يملك جميع الصلاحيات (غير قابل للتعديل).
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {allPermissions.map((perm) => (
              <label
                key={perm}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent/50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(perm)}
                  onChange={() => toggle(perm)}
                />
                {permLabels[perm] ?? perm}
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? "..." : "حفظ الصلاحيات"}
            </Button>
            {message && (
              <span className="text-xs text-muted-foreground">{message}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AssignRole() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function assign() {
    setMessage(null);
    if (!email) {
      setMessage("أدخل بريد المستخدم");
      return;
    }
    start(async () => {
      const res = await updateUserRole(email, role);
      if (res.ok) {
        setMessage("تم تعيين الدور بنجاح");
        setEmail("");
        router.refresh();
      } else {
        setMessage(res.error);
      }
    });
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="mb-3 font-semibold">تعيين دور لمستخدم</h3>
      <div className="flex flex-wrap items-end gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="بريد المستخدم الإلكتروني"
          className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="CUSTOMER">عميل (إزالة الصلاحيات)</option>
        </select>
        <Button size="sm" onClick={assign} disabled={pending}>
          {pending ? "..." : "تعيين"}
        </Button>
      </div>
      {message && (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

export function RolesManager({
  roles,
  allPermissions,
  permLabels,
}: {
  roles: RoleData[];
  allPermissions: string[];
  permLabels: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <AssignRole />
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((r) => (
          <RoleCard
            key={r.role}
            data={r}
            allPermissions={allPermissions}
            permLabels={permLabels}
          />
        ))}
      </div>
    </div>
  );
}
