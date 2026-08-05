'use client'

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date'

import type { DraftSubOrder } from '@/types'

// The suborders of a parked draft, rendered inside the expanded draft row.
// Mirrors the orders table's suborder rows minus the print action: a draft has
// no printable suborder page. Every field except the patient may still be
// undecided, hence the null-tolerant cells.
const columns: ColumnDef<DraftSubOrder>[] = [
  {
    id: 'name',
    cell: ({ row }) => (
      <div>{`${row.original.patient.last_name} ${row.original.patient.first_name}`}</div>
    ),
  },
  {
    id: 'dateOfBirth',
    cell: ({ row }) => <div>{formatDate(row.original.patient.date_of_birth)}</div>,
  },
  {
    id: 'invoice',
    cell: ({ row }) =>
      row.original.invoice_type ? (
        <Badge variant='outline'>{row.original.invoice_type}</Badge>
      ) : (
        <span className='text-muted-foreground'>—</span>
      ),
  },
  {
    id: 'eyes',
    cell: ({ row }) => (
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
    ),
  },
]

export const DraftSubOrdersTable = ({ subOrders }: { subOrders: DraftSubOrder[] }) => {
  const table = useReactTable({
    data: subOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table>
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
  )
}
