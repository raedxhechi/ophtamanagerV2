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
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  order: {
    application_date: string | null;
    delivery_date: string | null;
    medicine: {
      name: string;
    } | null;
  };
}



/** Column headers are keyed by column id under the `headers` message group. */
type TFn = (key: string) => string;

function getColumns(): ColumnDef<SubOrderForPatient>[] {
  return [
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
  const columns = React.useMemo(() => getColumns(), []);
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
      <div className="overflow-hidden rounded-lg border">
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
