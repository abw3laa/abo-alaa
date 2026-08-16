import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function Loading() {
  return (
    <div className="container py-8">
      <div className="skeleton mb-6 h-8 w-40" />
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="hidden space-y-4 md:block">
          <div className="skeleton h-6 w-24" />
          <div className="skeleton h-40 w-full" />
        </div>
        <LoadingSkeleton count={8} />
      </div>
    </div>
  );
}
