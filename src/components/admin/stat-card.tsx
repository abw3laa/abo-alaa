import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  alert?: boolean;
}

export function StatCard({ title, value, icon: Icon, alert }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              alert && "text-destructive"
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-full",
            alert
              ? "bg-destructive/10 text-destructive"
              : "bg-gold/10 text-gold"
          )}
        >
          <Icon className="size-6" />
        </div>
      </div>
    </div>
  );
}
