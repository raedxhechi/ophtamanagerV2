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

import { pharmacyAddressLine } from "@/lib/pharmacy";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { AdminPharmacyRow, PharmacyOfficeOption } from "./AdminPharmaciesData";
import { AddPharmacyDrawer } from "./AddPharmacyDrawer";
import { AdminPharmacyDrawer } from "./AdminPharmacyDrawer";

function orDash(value: string | null): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

const columns: ColumnDef<AdminPharmacyRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {row.original.default_pharmacy ? (
          <Badge variant="secondary" className="shrink-0">
            Default
          </Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "contact_person",
    header: "Contact person",
    cell: ({ row }) => orDash(row.original.contact_person),
  },
  {
    accessorKey: "phone_number",
    header: "Phone",
    cell: ({ row }) => orDash(row.original.phone_number),
  },
  {
    id: "address",
    accessorFn: (row) => pharmacyAddressLine(row),
    header: "Address",
    cell: ({ row }) => orDash(pharmacyAddressLine(row.original) || null),
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
      // One line wide however many there are: the drawer lists them, and the
      // title carries them for a hover.
      return (
        <Badge
          variant="outline"
          title={offices
            .map((office) => office.name ?? "Unnamed office")
            .join(", ")}
        >
          {offices.length} office{offices.length === 1 ? "" : "s"}
        </Badge>
      );
    },
  },
];

/**
 * How long to wait before opening the edit drawer for the one the "add"
 * drawer just closed. Both are focus-trapping overlays, and opening the second
 * while the first is still closing hands them the same fight the user drawer's
 * delete confirmation avoids by not being a dialog at all.
 */
const DRAWER_HANDOVER_MS = 150;

export function AdminPharmaciesTable({
  data,
  offices,
}: {
  data: AdminPharmacyRow[];
  /** Every doctor office, with the pharmacy each is attached to today. */
  offices: PharmacyOfficeOption[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [selected, setSelected] = React.useState<AdminPharmacyRow | null>(null);

  const table = useReactTable({
    data,
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

  const fallback = data.find((row) => row.default_pharmacy) ?? data[0];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <AddPharmacyDrawer
          onEditDefault={
            fallback
              ? () => {
                  window.setTimeout(
                    () => setSelected(fallback),
                    DRAWER_HANDOVER_MS
                  );
                }
              : undefined
          }
        />
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
                  There are no pharmacies yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-muted-foreground text-sm">
        {data.length} pharmac{data.length === 1 ? "y" : "ies"}
      </div>

      <AdminPharmacyDrawer
        pharmacy={selected}
        offices={offices}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
