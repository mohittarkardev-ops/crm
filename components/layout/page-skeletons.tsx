import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatTiles() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} index={i} className="p-4">
          <div className="border-l-[3px] border-divider pl-3">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Shown instantly while a list page (or the dashboard) loads its data. */
export function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <span className="sr-only">Loading…</span>
      <StatTiles />
      <Card index={4}>
        <div className="mb-4 flex items-center justify-between gap-3 border-b-[1.5px] border-rule pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-56" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-divider py-4 first:border-t-0">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="hidden h-4 w-28 md:block" />
            <Skeleton className="hidden h-4 w-24 lg:block" />
            <Skeleton className="ml-auto h-6 w-20" />
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Shown instantly while a policy or quote detail page loads. */
export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <span className="sr-only">Loading…</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {[0, 1].map((col) => (
          <div key={col} className="space-y-4">
            {[0, 1].map((card) => (
              <Card key={card} index={col * 2 + card}>
                <div className="mb-4 border-b-[1.5px] border-rule pb-3">
                  <Skeleton className="h-5 w-36" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
