"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useTableSettings } from "@/hooks/use-table-settings";
import { Button } from "@/components/ui/button";
import { ColumnSelector } from "@/components/table/ColumnSelector";
import { OrderStatusCell } from "@/components/orders/OrderStatusCell";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";
import { OfficeFilter, type OfficeOption } from "../../_components/OfficeFilter";
import { useAdminFilters } from "../../_components/useAdminFilters";
import type { AdminOrderRow, AdminOrdersFilters } from "./AdminOrdersData";
import { AddOrderDrawer } from "./AddOrderDrawer";
import { AdminOrderDrawer } from "./AdminOrderDrawer";

/** "application_date" -> "Application date" for the column-visibility menu. */
function prettify(id: string): string {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

/** The creator's name, falling back to their email. */
function creatorLabel(order: AdminOrderRow): string {
  const user = order.created_by_user;
  if (!user) return "";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.email || "";
}

const columns: ColumnDef<AdminOrderRow>[] = [
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
    id: "doctor_office",
    accessorFn: (row) => row.doctor_office?.name ?? "",
    header: "Doctor office",
    cell: ({ row }) => orDash(row.original.doctor_office?.name ?? null),
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.quantity}</span>
    ),
  },
  {
    id: "suborders",
    accessorFn: (row) => row.suborders.length,
    header: "Suborders",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.suborders.length}</span>
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
    // Always editable here: proxy.ts turns away anyone but an admin from
    // /admin, and AdminOrdersData checks is_admin() before it queries, so there
    // is no reader of this table who could not also write the column.
    cell: ({ row }) => (
      <OrderStatusCell
        orderId={row.original.id}
        status={row.original.status}
        editable
      />
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => orDash(formatDate(row.original.created_at) || null),
  },
  {
    id: "created_by",
    accessorFn: creatorLabel,
    header: "Created by",
    cell: ({ row }) => orDash(creatorLabel(row.original) || null),
  },
];

// What a user with no saved settings gets. Both are module constants because
// useTableSettings keys its derived state off their identity.
const columnIds = columns.map(
  (column) => column.id ?? (column as { accessorKey: string }).accessorKey
);
const defaultVisibility = { created_by: false };

export function AdminOrdersTable({
  data,
  offices,
  filters,
  pageCount,
  totalCount,
  pageSize,
}: {
  data: AdminOrderRow[];
  /** Every doctor office, for the office filter. */
  offices: OfficeOption[];
  /** The filters currently applied, mirrored from the URL. */
  filters: AdminOrdersFilters;
  /** Total number of pages, derived from the filtered order count. */
  pageCount: number;
  /** The filtered order count across all pages. */
  totalCount: number;
  /** Rows fetched per page. */
  pageSize: number;
}) {
  const { setFilters, isPending } = useAdminFilters();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Clicking a row opens a drawer with the order, its suborders, and the
  // editable form for both.
  const [selected, setSelected] = React.useState<AdminOrderRow | null>(null);

  // The search box is controlled and seeded from the URL; typing is debounced
  // before it is committed so a round-trip doesn't fire on every keystroke.
  const [searchInput, setSearchInput] = React.useState(filters.search);
  React.useEffect(() => setSearchInput(filters.search), [filters.search]);
  React.useEffect(() => {
    const next = searchInput.trim();
    if (next === filters.search) return;
    const timeout = setTimeout(
      () => setFilters({ q: next || null }, { replace: true }),
      300
    );
    return () => clearTimeout(timeout);
  }, [searchInput, filters.search, setFilters]);

  const goToPage = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, next), pageCount);
      setFilters(
        { page: clamped > 1 ? String(clamped) : null },
        { keepPage: true }
      );
    },
    [pageCount, setFilters]
  );

  // Which columns are shown and in what order: seeded from the user's saved
  // settings and written back whenever they change it.
  const {
    state: columnSettings,
    isReady,
    onColumnOrderChange,
    onColumnVisibilityChange,
  } = useTableSettings({
    settingsKey: "admin_orders_settings",
    columnIds,
    defaultVisibility,
  });

  const table = useReactTable({
    data,
    columns,
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
      <AdminTableSkeleton columnCount={table.getVisibleLeafColumns().length} />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search orders…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-9 w-full max-w-xs sm:w-72"
          />
          <OfficeFilter
            offices={offices}
            value={filters.office}
            onChange={(officeId) => setFilters({ office: officeId })}
          />
        </div>
        <div className="flex items-center gap-2">
          <ColumnSelector table={table} label={prettify} triggerLabel="Columns" />
          <AddOrderDrawer offices={offices} defaultOfficeId={filters.office} />
        </div>
      </div>

      {/* Table — dimmed while the next set loads, so the rows still on screen
          read as stale without the search input losing focus. */}
      <div
        className={cn(
          "overflow-x-auto rounded-lg border transition-opacity",
          isPending && "pointer-events-none opacity-50"
        )}
        aria-busy={isPending}
      >
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
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
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-muted-foreground h-24 text-center"
                >
                  No orders match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — server-driven via the `page` search param. */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          {totalCount} order{totalCount === 1 ? "" : "s"}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="text-muted-foreground hidden items-center gap-2 text-sm lg:flex">
            {pageSize} per page
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {filters.page} of {pageCount}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => goToPage(1)}
              disabled={filters.page <= 1}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => goToPage(filters.page - 1)}
              disabled={filters.page <= 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => goToPage(filters.page + 1)}
              disabled={filters.page >= pageCount}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => goToPage(pageCount)}
              disabled={filters.page >= pageCount}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>

      <AdminOrderDrawer
        order={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
