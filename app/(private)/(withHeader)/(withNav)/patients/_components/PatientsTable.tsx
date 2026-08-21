"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { DataTableRowActions } from "./SubOrdersTable/RowActions";
import {
  SubordersTable,
  type SubOrderForPatient,
} from "./SubOrdersTable/SubOrdersTable";
import { PatientDetailsDrawer } from "./PatientDetailsDrawer";
import { Patient, type InsuranceType } from "@/types";


export type PatientRow = Patient & {
  insurance_company: { name: string; insurance_type: InsuranceType } | null;
  suborders: SubOrderForPatient[];
};

// The abbreviations the practice uses for the two German insurance systems.
// Not translated — GKV/PKV are the same in every locale.
const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  Gesetzlich: "GKV",
  Privat: "PKV",
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
      id: "insurance_type",
      // Derived from the patient's insurance company, not stored on the
      // patient — sorting therefore groups by GKV/PKV, not by company.
      accessorFn: (row) => row.insurance_company?.insurance_type ?? "",
      header: t("headers.insurance_type"),
      cell: ({ row }) => {
        const type = row.original.insurance_company?.insurance_type;
        return type ? (
          <Badge variant="outline">{INSURANCE_TYPE_LABELS[type]}</Badge>
        ) : (
          orDash(null)
        );
      },
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
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ];
}

export function PatientsTable({
  data,
  page,
  pageCount,
  totalCount,
  pageSize,
  search,
}: {
  data: PatientRow[];
  /** 1-based index of the currently loaded page. */
  page: number;
  /** Total number of pages, derived from the office's patient count. */
  pageCount: number;
  /** The office's total (filtered) patient count across all pages. */
  totalCount: number;
  /** Rows fetched per page. */
  pageSize: number;
  /** The active server-side search, mirrored from the `q` search param. */
  search: string;
}) {
  const t = useTranslations("component.PatientsTable");
  const columns = React.useMemo(() => getColumns(t), [t]);

  // Each page arrives from the server with its patients' suborders already
  // embedded, so the rows are used as-is — no follow-up client fetch.
  const rows = data;

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

  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Clicking a row (outside the actions cell) opens a drawer with the full
  // patient record, including the fields not shown as columns.
  const [selectedPatient, setSelectedPatient] =
    React.useState<PatientRow | null>(null);

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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 w-full max-w-xs bg-white"
        />
        <div className="flex items-center gap-2">
          <ColumnSelector
            table={table}
            label={(columnId) => t(`headers.${columnId}`)}
            triggerLabel={t("columns")}
            triggerClassName="bg-white"
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
                             <TableRow
                               key={row.id}
                               className="cursor-pointer"
                               onClick={() => setSelectedPatient(row.original)}
                             >
                               {row.getVisibleCells().map((cell) => (
                                 <TableCell
                                   key={cell.id}
                                   onClick={
                                     cell.column.id === "actions"
                                       ? (e) => e.stopPropagation()
                                       : undefined
                                   }
                                 >
                                   {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                 </TableCell>
                               ))}
                             </TableRow>
                                {row.getIsExpanded() && (
                               <TableRow
                                 data-state={row.getIsSelected() && 'selected'}
                                 className='bg-background hover:bg-background'
                               >
                                 <TableCell colSpan={columns.length} className='py-0 pr-0 bg-background'>
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

      {/* Pagination — server-driven via the `page` search param. */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          {totalCount} patient(s)
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

      <PatientDetailsDrawer
        patient={selectedPatient}
        open={selectedPatient !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPatient(null);
        }}
      />
    </div>
  );
}
