import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TableSkeletonProps = {
  /** How many column placeholders to draw. */
  columnCount: number;
  /** Defaults to a full first page. */
  rowCount?: number;
  /** The table's header colour, e.g. "bg-blue-600". */
  headerClassName?: string;
};

/**
 * Stand-in for a list table while its column settings load. It mirrors the real
 * toolbar / table / pagination layout so the page doesn't jump when the real
 * table takes its place — see useTableSettings for why the table waits at all.
 */
export function TableSkeleton({
  columnCount,
  rowCount = 10,
  headerClassName,
}: TableSkeletonProps) {
  return (
    <div className="flex w-full flex-col gap-4" aria-busy="true">
      {/* Toolbar: search box on the left, "Columns" + the add button on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-9 w-full max-w-xs" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className={cn("flex items-center gap-4 px-4 py-3", headerClassName)}>
          {Array.from({ length: columnCount }, (_, index) => (
            <Skeleton key={index} className="h-4 flex-1 bg-white/25" />
          ))}
        </div>
        {Array.from({ length: rowCount }, (_, row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-t bg-white px-4 py-3.5"
          >
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
