import Link from "next/link";
import { auth } from "@/lib/auth";
import { ExternalLink } from "lucide-react";

export async function AdminTopbar() {
  const session = await auth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <h1 className="text-lg font-semibold">
        مرحباً، {session?.user?.name ?? "المدير"}
      </h1>
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-4" />
          عرض المتجر
        </Link>
        <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
          {session?.user?.role}
        </span>
      </div>
    </header>
  );
}
