"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { formatDate, formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useTableSettings } from "@/hooks/use-table-settings";
import { Button } from "@/components/ui/button";
import { ColumnSelector } from "@/components/table/ColumnSelector";
import { OrderStatusCell } from "@/components/orders/OrderStatusCell";
import { TableSkeleton } from "@/components/table/TableSkeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubordersTable } from "./SubOrdersTable.tsx/SubOrdersTable";

import type { OrderWithSubOrders } from "@/types";
import { DataTableRowActions } from "./RowActions";
import { useEffect } from "react";

// The order rows this table renders: an order with its medicine and its
// suborders (each carrying its patient). See OrderWithSubOrders in types/orders.
export type OrderRow = OrderWithSubOrders;

/**
 * Passed through the table rather than closed over, so `columns` can stay a
 * module constant — useTableSettings keys its derived state off that identity,
 * and rebuilding the array each render would reset the saved column layout.
 */
type OrdersTableMeta = { canEditStatus: boolean };

/** "application_date" -> "Application date" for the column-visibility menu. */
function prettify(id: string): string {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

const columns: ColumnDef<OrderRow>[] = [
  {
    id: "medicine",
    accessorFn: (row) => row.medicine?.name ?? "",
    header: "Medicine",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.medicine?.name ?? "—"}</span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.quantity}</span>
    ),
  },
  {
    accessorKey: "application_date",
    header: "Application date",
    cell: ({ row }) => orDash(formatDate(row.original.application_date) || null),
  },
  {
    accessorKey: "delivery_date",
    header: "Delivery date",
    cell: ({ row }) => orDash(formatDate(row.original.delivery_date) || null),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row, table }) => (
      <OrderStatusCell
        orderId={row.original.id}
        status={row.original.status}
        editable={(table.options.meta as OrdersTableMeta).canEditStatus}
      />
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => orDash(formatDateTime(row.original.created_at) || null),
  },
     {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
];

// What a user with no saved settings gets. Both are module constants because
// useTableSettings keys its derived state off their identity.
const columnIds = columns.map(
  (column) => column.id ?? (column as { accessorKey: string }).accessorKey
);
// "Created" starts hidden; toggle it back on via "Columns".
const defaultVisibility = { created_at: false };

export function OrdersTable({
  data,
  page,
  pageCount,
  totalCount,
  pageSize,
  search,
  canEditStatus,
}: {
  data: OrderRow[];
  /** 1-based index of the currently loaded page. */
  page: number;
  /** Total number of pages, derived from the office's order count. */
  pageCount: number;
  /** The office's total (filtered) order count across all pages. */
  totalCount: number;
  /** Rows fetched per page. */
  pageSize: number;
  /** The active server-side search, mirrored from the `q` search param. */
  search: string;
  /**
   * Whether the status cell is a dropdown or a read-only badge — true for an
   * admin or a manager, who are the only roles RLS lets update an order.
   */
  canEditStatus: boolean;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

    useEffect(() => {
  console.log({data})
  }, [data]);

  // Page navigation and search are both server-driven via search params:
  // `?page=#` refetches that page, `?q=` refetches the office-wide matches.
  // Both run as transitions so `isPending` can mark the rows on screen as
  // stale; paginating additionally remounts the page's Suspense boundary, which
  // swaps the whole table for a skeleton.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const goToPage = React.useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(1, nextPage), pageCount);
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(clamped));
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [pageCount, pathname, router, searchParams]
  );
  const canPreviousPage = page > 1;
  const canNextPage = page < pageCount;

  // The search box is a controlled input seeded from the `q` param. Typing is
  // debounced before it's committed to the URL, and committing a new search
  // resets back to page 1.
  const [searchInput, setSearchInput] = React.useState(search);
  React.useEffect(() => setSearchInput(search), [search]);
  React.useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, search, pathname, router, searchParams]);

  // Which columns are shown and in what order: seeded from the user's saved
  // settings and written back whenever they change it.
  const {
    state: columnSettings,
    isReady,
    onColumnOrderChange,
    onColumnVisibilityChange,
  } = useTableSettings({
    settingsKey: "orders_table_settings",
    columnIds,
    defaultVisibility,
  });

  const table = useReactTable({
    data,
    columns,
    meta: { canEditStatus } satisfies OrdersTableMeta,
    state: { sorting, ...columnSettings },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnVisibilityChange,
    onColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Hold the table back until the saved column settings have settled, so it
  // isn't drawn in its default shape and then rearranged.
  if (!isReady) {
    return (
      <TableSkeleton
        columnCount={table.getVisibleLeafColumns().length}
        headerClassName="bg-neutral-900"
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search orders…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 w-full max-w-xs bg-white"
        />
        <div className="flex items-center gap-2">
          <ColumnSelector
            table={table}
            label={prettify}
            triggerLabel="Columns"
            triggerClassName="bg-white"
          />
          <Button
            asChild
            size="sm"
            className="bg-neutral-900 text-white hover:bg-black"
          >
            <Link href="/orders/new">
              <Plus />
              <span className="hidden lg:inline">Add order</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Table — dimmed while a search is in flight, so the rows still on
          screen read as stale without the input losing focus. */}
      <div
        className={cn(
          "overflow-hidden rounded-lg border transition-opacity",
          isPending && "pointer-events-none opacity-50"
        )}
        aria-busy={isPending}
      >
        <Table>
          <TableHeader className="bg-neutral-900 sticky top-0 z-10 [&_th]:text-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                   {row.getIsExpanded() && (
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className='bg-background hover:bg-background'
                  >
                    <TableCell colSpan={columns.length} className='p-4 pl-[60px] bg-background'>
                      <div className='flex h-full'>
                        <SubordersTable
                          subOrders={row.original.suborders.map((suborder) => ({
                            ...suborder,
                            order: row.original,
                          }))}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — server-driven via the `page` search param. */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          {totalCount} order(s)
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex text-sm text-muted-foreground">
            {pageSize} per page
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {page} of {pageCount}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => goToPage(1)}
              disabled={!canPreviousPage}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => goToPage(page - 1)}
              disabled={!canPreviousPage}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => goToPage(page + 1)}
              disabled={!canNextPage}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => goToPage(pageCount)}
              disabled={!canNextPage}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
