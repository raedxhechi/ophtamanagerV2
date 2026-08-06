import { Skeleton } from "@/components/ui/skeleton";

/**
 * The page chrome around the log browser. Shared by the page and by the
 * placeholder that stands in for it, so the heading paints immediately on
 * navigation and the content drops into a frame already reserved for it.
 */
export function LogsPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">System logs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every API call made by non-admin users — sign-ins, token refreshes and
          each request, with the status it came back with.
        </p>
      </div>
      {children}
    </div>
  );
}

/** Stand-in while the logs and their facet counts are still being fetched. */
export function LogsFallback() {
  return (
    <div className="flex w-full gap-6" aria-busy="true">
      <div className="hidden w-72 shrink-0 flex-col gap-2 lg:flex">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Skeleton className="h-9 w-full max-w-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="overflow-hidden rounded-lg border">
          {Array.from({ length: 12 }, (_, row) => (
            <div key={row} className="flex items-center gap-4 border-b px-4 py-3.5">
              {Array.from({ length: 6 }, (_, column) => (
                <Skeleton key={column} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
