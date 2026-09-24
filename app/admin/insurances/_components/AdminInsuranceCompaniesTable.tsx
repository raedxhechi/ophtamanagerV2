"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Constants } from "@/types/supabase";

import { AdminInsuranceCompanyDrawer } from "./AdminInsuranceCompanyDrawer";
import { InsuranceTypeBadge } from "./InsuranceTypeBadge";
import {
  insuranceTypeLabel,
  type AdminInsuranceCompanyRow,
} from "./types";

/** Sentinel for the "no filter" option — Radix rejects an empty value. */
const ALL_TYPES = "__all__";

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

const columns: ColumnDef<AdminInsuranceCompanyRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <InsuranceTypeBadge type={row.original.insurance_type} />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "insurance_type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {insuranceTypeLabel(row.original.insurance_type)}
      </span>
    ),
  },
  {
    accessorKey: "iknumber",
    header: "IK number",
    cell: ({ row }) => (
      <span className="tabular-nums">{orDash(row.original.iknumber)}</span>
    ),
  },
  {
    id: "offices",
    accessorFn: (row) => row.offices.length,
    header: "Doctor offices",
    cell: ({ row }) => {
      const { offices } = row.original;
      if (!offices.length) {
        return <span className="text-muted-foreground">None</span>;
      }
      // One line wide however many there are: the overview is where they are
      // listed, and the title carries them for a hover.
      return (
        <Badge
          variant="outline"
          title={offices.map((office) => office.name).join(", ")}
        >
          {offices.length} office{offices.length === 1 ? "" : "s"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "policyCount",
    header: "Policies",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.policyCount || (
          <span className="text-muted-foreground">None</span>
        )}
      </span>
    ),
  },
];

/**
 * Every insurance company, with the drawer that edits one.
 *
 * Filtering is client-side, like /admin/users and /admin/doctor-offices: this
 * is the whole catalog — a few dozen rows that arrived with the page — not a
 * page out of thousands, so there is nothing for a round-trip to fetch.
 */
export function AdminInsuranceCompaniesTable({
  data,
}: {
  data: AdminInsuranceCompanyRow[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<string>(ALL_TYPES);
  const [selected, setSelected] =
    React.useState<AdminInsuranceCompanyRow | null>(null);

  const rows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return data.filter((company) => {
      if (type !== ALL_TYPES && company.insurance_type !== type) return false;
      if (!needle) return true;
      // Name and IK number, which are the two ways an admin arrives knowing
      // which company they are after.
      return (
        company.name.toLowerCase().includes(needle) ||
        (company.iknumber ?? "").toLowerCase().includes(needle)
      );
    });
  }, [data, search, type]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Keep the open drawer on the freshly fetched row after a save, so it doesn't
  // show the values the server has just replaced.
  React.useEffect(() => {
    setSelected((current) =>
      current ? (data.find((row) => row.id === current.id) ?? null) : null
    );
  }, [data]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or IK number"
          className="w-full max-w-xs sm:w-72"
          aria-label="Search insurance companies"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-56" aria-label="Filter by insurance type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>All insurance types</SelectItem>
            {Constants.public.Enums.insurance_type.map((value) => (
              <SelectItem key={value} value={value}>
                {insuranceTypeLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
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
                  {data.length
                    ? "No insurance company matches those filters."
                    : "There are no insurance companies yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">
        {rows.length === data.length
          ? `${data.length} insurance ${data.length === 1 ? "company" : "companies"}`
          : `${rows.length} of ${data.length} insurance companies`}
      </div>

      <AdminInsuranceCompanyDrawer
        company={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}