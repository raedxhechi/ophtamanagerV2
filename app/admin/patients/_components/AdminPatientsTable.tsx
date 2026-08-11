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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnSelector } from "@/components/table/ColumnSelector";
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
import type { AdminPatientRow, AdminPatientsFilters } from "./AdminPatientsData";
import { AddPatientDrawer } from "./AddPatientDrawer";
import { AdminPatientDrawer } from "./AdminPatientDrawer";

/** "date_of_birth" -> "Date of birth" for the column-visibility menu. */
function prettify(id: string): string {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

const columns: ColumnDef<AdminPatientRow>[] = [
  {
    id: "name",
    accessorFn: (row) =>
      [row.last_name, row.first_name].filter(Boolean).join(", "),
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">
        {[row.original.last_name, row.original.first_name]
          .filter(Boolean)
          .join(", ")}
      </span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "date_of_birth",
    header: "Date of birth",
    cell: ({ row }) => orDash(formatDate(row.original.date_of_birth) || null),
  },
  {
    id: "doctor_office",
    accessorFn: (row) => row.doctor_office?.name ?? "",
    header: "Doctor office",
    cell: ({ row }) => orDash(row.original.doctor_office?.name ?? null),
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) =>
      row.original.gender ? (
        <Badge variant="outline" className="capitalize">
          {row.original.gender}
        </Badge>
      ) : (
        orDash(null)
      ),
  },
  {
    id: "insurance_company",
    accessorFn: (row) => row.insurance_company?.name ?? "",
    header: "Insurance company",
    cell: ({ row }) => orDash(row.original.insurance_company?.name ?? null),
  },
  {
    accessorKey: "insurance_number",
    header: "Insurance number",
    cell: ({ row }) => orDash(row.original.insurance_number),
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
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => orDash(row.original.city),
  },
  {
    accessorKey: "street",
    header: "Street",
    cell: ({ row }) => orDash(row.original.street),
  },
  {
    accessorKey: "house_number",
    header: "House number",
    cell: ({ row }) => orDash(row.original.house_number),
  },
  {
    accessorKey: "zipcode",
    header: "Zipcode",
    cell: ({ row }) => orDash(row.original.zipcode),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => orDash(formatDate(row.original.created_at) || null),
  },
];

// What a user with no saved settings gets. Both are module constants because
// useTableSettings keys its derived state off their identity.
const columnIds = columns.map(
  (column) => column.id ?? (column as { accessorKey: string }).accessorKey
);
const defaultVisibility = {
  street: false,
  house_number: false,
  zipcode: false,
  created_at: false,
};

export function AdminPatientsTable({
  data,
  offices,
  filters,
  pageCount,
  totalCount,
  pageSize,
}: {
  data: AdminPatientRow[];
  /** Every doctor office, for the office filter. */
  offices: OfficeOption[];
  /** The filters currently applied, mirrored from the URL. */
  filters: AdminPatientsFilters;
  /** Total number of pages, derived from the filtered patient count. */
  pageCount: number;
  /** The filtered patient count across all pages. */
  totalCount: number;
  /** Rows fetched per page. */
  pageSize: number;
}) {
  const { setFilters, isPending } = useAdminFilters();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Clicking a row opens a drawer with the full record — the fields no column
  // shows, the patient's suborders, and the editable form.
  const [selected, setSelected] = React.useState<AdminPatientRow | null>(null);

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
    settingsKey: "admin_patients_settings",
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
            placeholder="Search patients…"
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
          <AddPatientDrawer offices={offices} defaultOfficeId={filters.office} />
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
                  No patients match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — server-driven via the `page` search param. */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          {totalCount} patient{totalCount === 1 ? "" : "s"}
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

      <AdminPatientDrawer
        patient={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
