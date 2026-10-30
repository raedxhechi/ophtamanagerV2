'use client'

import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import type { SubOrder } from '@/types'
import { swapMarkings } from '@/lib/swaps'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { SwapDrawer } from './SwapDrawer'
import { useColumns } from './useColumns'

export const SubordersTable = ({
  subOrders,
  hideActions,
  doctorOfficeId,
  allowSwap = true,
}: {
  subOrders: SubOrder[]
  hideActions?: boolean
  /** Scopes the swap drawer's patient search; see SwapDrawer. */
  doctorOfficeId?: string
  /**
   * Whether the rows offer "create a swap". On by default for the orders view,
   * which is where swapping belongs; a caller showing suborders purely for
   * reference turns it off.
   */
  allowSwap?: boolean
}) => {
  // One drawer for the whole table rather than one per row: a row only has to
  // say which suborder it is, and the drawer renders nothing until one is set.
  const [swapFrom, setSwapFrom] = useState<SubOrder | null>(null)

  // A swap lives on the same order as its original, so every parent and child
  // of a row in this list is also in it: the marks need no query of their own.
  const markings = useMemo(() => swapMarkings(subOrders), [subOrders])

  const columns = useColumns(
    hideActions,
    allowSwap && !hideActions ? setSwapFrom : undefined,
    markings
  )
  const table = useReactTable({
    data: subOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="w-full overflow-hidden rounded-lg border bg-background">
        <Table>
        {/* <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
        </TableHeader> */}
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

      {/*
        Outside the bordered wrapper, so the drawer isn't clipped by its
        overflow-hidden. `open` follows the picked suborder, and closing clears
        it so the next open starts from the row that was actually clicked.
      */}
      <SwapDrawer
        subOrder={swapFrom}
        open={!!swapFrom}
        onOpenChange={(open) => {
          if (!open) setSwapFrom(null)
        }}
        doctorOfficeId={doctorOfficeId}
      />
    </>
  )
}
