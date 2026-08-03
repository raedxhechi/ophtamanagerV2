'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { DataTableToolbar } from './create-order-table-toolbar'
import { DataTablePagination } from './data-table-pagination'
import { useTranslation } from 'react-i18next'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  disableSearch?: boolean
  // When provided, the search box filters server-side (via the parent query)
  // instead of filtering the loaded rows.
  search?: string
  onSearchChange?: (value: string) => void
  // When provided, the table becomes an infinite-scroll box: rows live in a
  // fixed-height scroll area and reaching the bottom fetches the next page.
  onLoadMore?: () => void
  hasMore?: boolean
  isFetchingMore?: boolean
}

// Number of flashing skeleton rows shown while fetching the next page.
const SKELETON_ROWS = 2
// Fixed height of the scroll box — roughly five rows.
const SCROLL_BOX_HEIGHT = 'h-[320px]'

export function DataTable<TData, TValue>({
  columns,
  data,
  disableSearch = false,
  search,
  onSearchChange,
  onLoadMore,
  hasMore,
  isFetchingMore,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation()

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])

  const infinite = onLoadMore !== undefined

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // In infinite mode all fetched rows render inside the scroll box (no paging).
  React.useEffect(() => {
    if (infinite) table.setPageSize(Number.MAX_SAFE_INTEGER)
  }, [infinite, table])

  const rows = table.getRowModel().rows

  // Load the next page when the user scrolls near the bottom of the box.
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!onLoadMore || !hasMore || isFetchingMore) return
    const el = event.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      onLoadMore()
    }
  }

  const bodyRows = (
    <TableBody>
      {rows?.length ? (
        rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.getIsSelected() && 'selected'}
            className='bg-[#ffffff]'
          >
            {row.getVisibleCells().map((cell, index) => (
              <TableCell
                key={cell.id}
                className={`py-2 ${index === 0 ? 'rounded-l-xl' : ''}
                ${index === row.getVisibleCells().length - 1 ? 'rounded-r-xl' : ''}`}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : !isFetchingMore ? (
        <TableRow>
          <TableCell colSpan={columns.length} className='h-24 text-center'>
            {t('component.DataTable.noResults')}
          </TableCell>
        </TableRow>
      ) : null}

      {isFetchingMore &&
        Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
          <TableRow key={`skeleton-${rowIndex}`} className='bg-[#ffffff]'>
            {Array.from({ length: columns.length }).map((__, colIndex) => (
              <TableCell
                key={colIndex}
                className={`py-2 ${colIndex === 0 ? 'rounded-l-xl' : ''} ${
                  colIndex === columns.length - 1 ? 'rounded-r-xl' : ''
                }`}
              >
                <div className='h-4 w-full max-w-[120px] animate-pulse rounded bg-gray-200' />
              </TableCell>
            ))}
          </TableRow>
        ))}
    </TableBody>
  )

  return (
    <div className='space-y-0  w-full'>
      {!disableSearch && (
        <DataTableToolbar table={table} search={search} onSearchChange={onSearchChange} />
      )}

      {infinite ? (
        <div className={`${SCROLL_BOX_HEIGHT} overflow-y-auto`} onScroll={handleScroll}>
          <Table className='border-separate border-spacing-y-2 '>{bodyRows}</Table>
        </div>
      ) : (
        <>
          <Table className='border-separate border-spacing-y-2 '>{bodyRows}</Table>
          <DataTablePagination table={table} />
        </>
      )}
    </div>
  )
}
