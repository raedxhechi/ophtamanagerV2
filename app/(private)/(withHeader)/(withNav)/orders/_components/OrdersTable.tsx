"use client";

import * as React from "react";
import Link from "next/link";
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
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { formatDate } from "@/lib/date";
import { useTableSettings } from "@/hooks/use-table-settings";
import { Button } from "@/components/ui/button";
import { ColumnSelector } from "@/components/table/ColumnSelector";
import { TableSkeleton } from "@/components/table/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// The order rows this table renders: an order with its medicine and its
// suborders (each carrying its patient). See OrderWithSubOrders in types/orders.
export type OrderRow = OrderWithSubOrders;

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
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => orDash(formatDate(row.original.created_at) || null),
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

export function OrdersTable({ data }: { data: OrderRow[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
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
    state: { sorting, globalFilter, ...columnSettings },
    getRowId: (row) => row.id,
    globalFilterFn: "includesString",
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange,
    onColumnOrderChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
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
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 w-full max-w-xs"
        />
        <div className="flex items-center gap-2">
          <ColumnSelector
            table={table}
            label={prettify}
            triggerLabel="Columns"
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

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
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
                  <TableRow data-state={row.getIsSelected() && 'selected'}>
                    <TableCell colSpan={columns.length} className='py-0 pr-0'>
                      <div className='flex h-full my-[-0.5rem] ml-[60px]'>
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          {table.getFilteredRowModel().rows.length} order(s)
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
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
