"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { client } from "@/api/browser/client";
import { useTableSettings } from "@/hooks/use-table-settings";
import { ColumnSelector } from "@/components/table/ColumnSelector";
import { TableSkeleton } from "@/components/table/TableSkeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Stub the supabase client so the real data layer runs against a slow, known
// response. Everything above this boundary (api/browser -> react-query -> hook
// -> table) is the real code path.
// ---------------------------------------------------------------------------
const SAVED = {
  columnOrder: [
    "created_at",
    "medicine",
    "delivery_date",
    "application_date",
    "quantity",
  ],
  columnVisibility: { quantity: false },
};
const upserts: unknown[] = [];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

if (typeof window !== "undefined") {
  (window as any).__upserts = upserts;
  (client.auth as any).getUser = async () => ({
    data: { user: { id: "fake-user" } },
    error: null,
  });
  (client as any).from = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          await delay(4000);
          return {
            data: { user_id: "fake-user", orders_table_settings: SAVED },
            error: null,
          };
        },
      }),
    }),
    upsert: (payload: unknown) => {
      upserts.push(payload);
      return {
        select: () => ({
          single: async () => ({ data: { user_id: "fake-user" }, error: null }),
        }),
      };
    },
  });
}

type Row = { id: string; medicine: string; quantity: number; application_date: string; delivery_date: string; created_at: string };

const columns: ColumnDef<Row>[] = [
  { id: "medicine", accessorFn: (r) => r.medicine, header: "Medicine", enableHiding: false },
  { accessorKey: "quantity", header: "Quantity" },
  { accessorKey: "application_date", header: "Application date" },
  { accessorKey: "delivery_date", header: "Delivery date" },
  { accessorKey: "created_at", header: "Created" },
  { id: "actions", cell: () => "…" },
];

const columnIds = columns.map((c) => c.id ?? (c as { accessorKey: string }).accessorKey);
const defaultVisibility = { created_at: false };

const data: Row[] = [
  { id: "1", medicine: "Lucentis", quantity: 2, application_date: "01.02.2026", delivery_date: "03.02.2026", created_at: "31.01.2026" },
  { id: "2", medicine: "Eylea", quantity: 1, application_date: "05.02.2026", delivery_date: "07.02.2026", created_at: "01.02.2026" },
];

function prettify(id: string) {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Page() {
  const { state, isReady, onColumnOrderChange, onColumnVisibilityChange } =
    useTableSettings({
      settingsKey: "orders_table_settings",
      columnIds,
      defaultVisibility,
    });

  const table = useReactTable({
    data,
    columns,
    state,
    getRowId: (r) => r.id,
    onColumnOrderChange,
    onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Record what every single render actually put on screen, so a one-frame
  // flash of the default shape can't hide between screenshots.
  const headers = table.getVisibleLeafColumns().map((c) => c.id).join(",");
  if (typeof window !== "undefined") {
    const w = window as any;
    w.__renders = w.__renders || [];
    w.__renders.push(isReady ? headers : "SKELETON");
  }

  if (!isReady) {
    return (
      <div className="p-8">
        <TableSkeleton columnCount={5} headerClassName="bg-neutral-900" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex justify-end">
        <ColumnSelector table={table} label={prettify} triggerLabel="Columns" />
      </div>
      <div id="order-probe" className="mb-4 text-sm">order: {headers}</div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
