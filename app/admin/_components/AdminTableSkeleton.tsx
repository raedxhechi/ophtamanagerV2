import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stand-in for an admin list table — while the server fetches its first page,
 * and again while the user's saved column settings load (see useTableSettings
 * for why the table waits at all). It mirrors the real toolbar / table /
 * pagination layout so the page doesn't jump when the table takes its place.
 *
 * The public tables use `components/table/TableSkeleton`, whose placeholder bars
 * are tuned for their dark header; admin headers are muted, so the bars here are
 * the plain foreground colour instead.
 */
export function AdminTableSkeleton({
  columnCount,
  rowCount = 10,
}: {
  /** How many column placeholders to draw. */
  columnCount: number;
  /** Defaults to enough rows to fill the fold. */
  rowCount?: number;
}) {
  return (
    <div className="flex w-full flex-col gap-4" aria-busy="true">
      {/* Toolbar: search + office filter on the left, "Columns" on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full max-w-xs sm:w-72" />
          <Skeleton className="h-9 w-56" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/50 flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columnCount }, (_, index) => (
            <Skeleton key={index} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rowCount }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-t px-4 py-3.5">
            {Array.from({ length: columnCount }, (_, column) => (
              <Skeleton key={column} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="hidden h-4 w-24 lg:block" />
        <Skeleton className="h-8 w-64" />
      </div>
    </div>
  );
}
