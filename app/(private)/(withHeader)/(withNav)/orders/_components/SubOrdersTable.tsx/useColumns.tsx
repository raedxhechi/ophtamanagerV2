'use client'

import { ColumnDef } from '@tanstack/react-table'

// import { Badge } from '../ui/badge'

// import { OrderSubOrderTableItem } from './schema'
// import { DataTableColumnHeader } from './table/data-table-column-header'
import { Eye, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { SubOrder } from '@/types'
// import { formatDateFromString } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateFromString } from '@/lib/utils'

export const useColumns = (hideActions?: boolean) => {
  const columns: ColumnDef<SubOrder>[] = [
    {
      accessorKey: 'Name',
      // header: ({ column }) => <DataTableColumnHeader column={column} title='Name' />,
      cell: ({ row }) => (
        <div className=''>{`${row.original.patient.last_name} ${row.original.patient.first_name}`}</div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'dateOfBirth',

      cell: ({ row }) => (
        <div className=''>
          {format(row.original.patient.date_of_birth, 'dd.MM.yyyy ', {
            locale: de,
          })}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },

    {
      accessorKey: 'medicine',
      // header: ({ column }) => <DataTableColumnHeader column={column} title='Medicine' />,
      cell: ({ row }) => {
        return (
          <div className='flex space-x-2'>
            <Badge variant='outline'>{row.original.order?.medicine?.name}</Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'applicationDate',
      // header: ({ column }) => <DataTableColumnHeader column={column} title='Application Date' />,
      cell: ({ row }) => (
        <div className=''>{`OP-Datum: ${formatDateFromString(row.original.order.application_date || '')}`}</div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'eyes',
      // header: ({ column }) => <DataTableColumnHeader column={column} title='Eyes' />,
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
  ]
  if (!hideActions) {
    const action: ColumnDef<SubOrder> = {
      accessorKey: 'print',
      cell: ({ row }) => (
        <Link href={`/suborder/${row.original.id}/print`} target='_blank' rel='noopener noreferrer'>
          <Button variant='outline'>
            <Printer />
          </Button>
        </Link>
      ),
    }
    columns.push(action)
  }
  return columns
}
