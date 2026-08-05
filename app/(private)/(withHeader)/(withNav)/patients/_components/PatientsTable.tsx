"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table";


import { formatDate } from "@/lib/date";
import { useTableSettings } from "@/hooks/use-table-settings";
import { Badge } from "@/components/ui/badge";
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
import { useSubOrdersByPatients } from "@/react-query/subOrders";
import { DataTableRowActions } from "./SubOrdersTable/RowActions";
import {
  SubordersTable,
  type SubOrderForPatient,
} from "./SubOrdersTable/SubOrdersTable";
import { Patient } from "@/types";


export type PatientRow = Patient & {
  insurance_company: { name: string } | null;
  suborders: SubOrderForPatient[];
};

// A few less-central columns are hidden for a user with no saved settings.
// A module constant because useTableSettings keys its derived state off its
// identity.
const defaultVisibility = {
  street: false,
  house_number: false,
  zipcode: false,
};

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

// Substring match across every column, but the date_of_birth column is compared
// on its displayed dd.mm.yyyy form so a user can search by typing e.g.
// "29.03.1940" even though the raw value is stored as ISO (1940-03-29).
const globalFilterFn: FilterFn<PatientRow> = (row, columnId, filterValue) => {
  const search = String(filterValue).toLowerCase();
  const raw = row.getValue(columnId);
  const value =
    columnId === "date_of_birth"
      ? formatDate(raw as string | null | undefined)
      : String(raw ?? "");
  return value.toLowerCase().includes(search);
};

/** Column headers are keyed by column id under the `headers` message group. */
type TFn = (key: string) => string;

function getColumns(t: TFn): ColumnDef<PatientRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) =>
        [row.last_name, row.first_name].filter(Boolean).join(", "),
      header: t("headers.name"),
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
      header: t("headers.date_of_birth"),
      cell: ({ row }) => orDash(formatDate(row.original.date_of_birth) || null),
    },
    {
      accessorKey: "gender",
      header: t("headers.gender"),
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
      header: t("headers.insurance_company"),
      cell: ({ row }) => orDash(row.original.insurance_company?.name ?? null),
    },
    {
      accessorKey: "insurance_number",
      header: t("headers.insurance_number"),
      cell: ({ row }) => orDash(row.original.insurance_number),
    },
    {
      accessorKey: "city",
      header: t("headers.city"),
      cell: ({ row }) => orDash(row.original.city),
    },
    {
      accessorKey: "street",
      header: t("headers.street"),
      cell: ({ row }) => orDash(row.original.street),
    },
    {
      accessorKey: "house_number",
      header: t("headers.house_number"),
      cell: ({ row }) => orDash(row.original.house_number),
    },
    {
      accessorKey: "zipcode",
      header: t("headers.zipcode"),
      cell: ({ row }) => orDash(row.original.zipcode),
    },
    {
      id: "actions",
      cell: ({ row, table }) => (
        <DataTableRowActions
          row={row}
          loading={
            (table.options.meta as { subOrdersLoading?: boolean } | undefined)
              ?.subOrdersLoading
          }
        />
      ),
    },
  ];
}

export function PatientsTable({ data }: { data: PatientRow[] }) {
  const t = useTranslations("component.PatientsTable");
  const columns = React.useMemo(() => getColumns(t), [t]);

  // Suborders are fetched on the client after this page has rendered (see the
  // hook) so they don't add to the server render's load time. Until they arrive
  // each patient just has an empty suborders list.
  const patientIds = React.useMemo(() => data.map((p) => p.id), [data]);
  const { data: subOrdersByPatient, isLoading: subOrdersLoading } =
    useSubOrdersByPatients(patientIds);
  const rows = React.useMemo<PatientRow[]>(
    () =>
      data.map((patient) => ({
        ...patient,
        suborders: subOrdersByPatient?.[patient.id] ?? [],
      })),
    [data, subOrdersByPatient]
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  // The column order a user with no saved settings gets.
  const columnIds = React.useMemo(
    () =>
      columns.map(
        (column) => column.id ?? (column as { accessorKey: string }).accessorKey
      ),
    [columns]
  );
  // Which columns are shown and in what order: seeded from the user's saved
  // settings and written back whenever they change it.
  const {
    state: columnSettings,
    isReady,
    onColumnOrderChange,
    onColumnVisibilityChange,
  } = useTableSettings({
    settingsKey: "patient_table_settings",
    columnIds,
    defaultVisibility,
  });

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, ...columnSettings },
    getRowId: (row) => row.id,
    meta: { subOrdersLoading },
    globalFilterFn,
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
        headerClassName="bg-blue-600"
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder={t("search")}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 w-full max-w-xs"
        />
        <div className="flex items-center gap-2">
          <ColumnSelector
            table={table}
            label={(columnId) => t(`headers.${columnId}`)}
            triggerLabel={t("columns")}
          />
          <Button
            asChild
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Link href="/patients/new">
              <Plus />
              <span className="hidden lg:inline">{t("addPatient")}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-blue-600 sticky top-0 z-10 [&_th]:text-white">
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
                                     <SubordersTable suborders={row.original.suborders} />
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
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          {table.getFilteredRowModel().rows.length} patient(s)
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
