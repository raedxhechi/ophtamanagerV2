"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
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
  type VisibilityState,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { SwapMarks } from "@/components/swap-marks";
import { formatDateFromString } from "@/lib/utils";
import { swapMarkings, type SwapMarking } from "@/lib/swaps";
import { useSwapRelations } from "@/react-query/subOrders";


import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";


export interface SubOrderForPatient{
  id: string;
  left_eye: boolean;
  right_eye: boolean;
  /** Set when this suborder replaces another one; see lib/swaps. */
  swapped_from_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  order: {
    created_at: string | null;
    application_date: string | null;
    delivery_date: string | null;
    medicine: {
      name: string;
    } | null;
  };
}



/** Column headers are keyed by column id under the `headers` message group. */
type TFn = (key: string) => string;

function getColumns(
  t: TFn,
  markings: Map<string, SwapMarking>
): ColumnDef<SubOrderForPatient>[] {
  return [
    {
      accessorKey: 'name',
      // The marks sit under the name rather than beside it, so a marked row
      // doesn't widen the column and shunt every other row's cells along.
      cell: ({ row }) => (
        <div className='flex flex-col gap-1'>
          <span className='font-medium'>
            {[row.original.last_name, row.original.first_name]
              .filter(Boolean)
              .join(', ')}
          </span>
          <SwapMarks marking={markings.get(row.original.id)} />
        </div>
      ),
    },
    {
      accessorKey: 'medicine',
      cell: ({ row }) => (
        <div className='flex space-x-2'>
          <Badge variant='outline'>{row.original.order.medicine?.name ?? ''}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'creation_date',
      cell: ({ row }) => (
        <div>{`${t("creationDate")}: ${formatDateFromString(row.original.order.created_at)}`}</div>
      ),
    },
    {
      accessorKey: 'operation_date',
      cell: ({ row }) => (
        <div>{`${t("operationDate")}: ${formatDateFromString(row.original.order.application_date)}`}</div>
      ),
    },
    {
      accessorKey: 'eyes',
      cell: ({ row }) => {
        return (
          <div className='flex space-x-2'>
            <div className='flex space-x-2'>
              <Badge
                variant={row.original.left_eye ? 'outline' : 'secondary'}
                className={`${
                  row.original.left_eye ? 'bg-[#246291] text-white ' : 'text-[#505050]'
                } h-[30px] pr-4 rounded-xl`}
              >
                <Eye className='mr-2' size={18} />
                {'LINKS'}
              </Badge>
            </div>
            <div className='flex space-x-2'>
              <Badge
                variant={row.original.right_eye ? 'outline' : 'secondary'}
                className={`${
                  row.original.right_eye ? 'bg-[#E10600] text-white ' : 'text-[#505050]'
                } h-[30px] pr-4 rounded-xl`}
              >
                {'RECHTS'}
                <Eye className='ml-2' size={18} />
              </Badge>
            </div>
          </div>
        )
      },
    },
  ];
}

export function SubordersTable({ suborders }: { suborders: SubOrderForPatient[] }) {
  const t = useTranslations("component.PatientsTable");

  // This list spans orders, and a swap names a different patient, so neither a
  // row's swaps nor the original it replaces are in it — both are fetched.
  const subOrderIds = React.useMemo(
    () => suborders.map((suborder) => suborder.id),
    [suborders]
  );
  const originalIds = React.useMemo(
    () =>
      Array.from(
        new Set(
          suborders
            .map((suborder) => suborder.swapped_from_id)
            .filter((id): id is string => !!id)
        )
      ),
    [suborders]
  );

  const { data: relations } = useSwapRelations(subOrderIds, originalIds);

  // Until the relations land this marks what the list alone can see, which is
  // nothing: no row claims swaps it cannot account for, it just shows fewer
  // marks for a moment.
  const markings = React.useMemo(
    () => swapMarkings([...suborders, ...(relations ?? [])]),
    [suborders, relations]
  );

  const columns = React.useMemo(() => getColumns(t, markings), [t, markings]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  // A few less-central columns are hidden by default; toggle them back on
  // via "Columns".
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      street: false,
      house_number: false,
      zipcode: false,
    });

  const table = useReactTable({
    data: suborders,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    getRowId: (row) => row.id,
    globalFilterFn: "includesString",
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="flex w-full flex-col gap-4 mb-4 mt-4">
      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
    
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
    </div>
  );
}
