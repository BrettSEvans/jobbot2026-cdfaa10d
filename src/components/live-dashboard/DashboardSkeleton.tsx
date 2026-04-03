import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="h-14 bg-muted/50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar skeleton */}
        <div className="hidden md:block w-[260px] border-r p-3 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* Hero skeleton */}
          <Skeleton className="h-32 w-full rounded-xl" />

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Skeleton className="h-24 col-span-2 rounded-lg" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>

          {/* Chart area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>

          {/* Table skeleton */}
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
