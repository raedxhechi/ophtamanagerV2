'use client'

import { ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'

import { Eye, Pencil, Trash } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { SelectInput } from '@/components/ui/selectInput'
import { AddedSubOrder } from './schema'

export const useAddedSubOrdersColums = () => {
  const t = useTranslations()

  const columns: ColumnDef<AddedSubOrder>[] = [
    {
      accessorKey: 'number',

      cell: ({ row }) => <div>{row.getValue('number')}</div>,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'fullName',

      cell: ({ row }) => <div>{row.getValue('fullName')}</div>,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'dateOfBirth',

      cell: ({ row }) => (
        <div>
          {format(row.getValue('dateOfBirth'), 'dd.MM.yyyy', {
            locale: de,
          })}
          {/* {JSON.stringify(row.getValue("dateOfBirth"))} */}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'ikNumber',

      cell: ({ row }) => {
        return row.original.ikNumber ? (
          <div className={`flex space-x-2 `}>
            <Badge variant='outline'>{row.getValue('ikNumber')}</Badge>
          </div>
        ) : (
          <></>
        )
      },
    },
    {
      accessorKey: 'invoice',

      cell: ({ row }) => {
        return (
          <div className={`flex space-x-2 `}>
            <SelectInput
              disabled={!!row.original.added}
              listValues={['Patient', 'Kasse', 'Praxis']}
              name='invoice'
              label='Rechnungsstellung'
              value={row.original.invoice}
            />
          </div>
        )
      },
    },
    {
      accessorKey: 'eyes',

      cell: ({ row }) => {
        return (
          <div className='flex space-x-2'>
            <div className='flex space-x-2'>
              <Badge
                variant={row.original.leftEye ? 'outline' : 'secondary'}
                // onClick={() => {
                //   !row.original.added &&
                //     !row.original.disabled &&
                //     row.original.toggleEye({
                //       leftEye: !row.original.leftEye,
                //       id: row.original.patientId,
                //       rightEye: row.original.rightEye,
                //     })
                // }}
                className={`  ${
                  row.original.leftEye ? 'bg-[#0000ff] text-white' : 'text-[#505050]'
                } ${row.original.added ? 'cursor-not-allowed' : ''}
              'cursor-pointer'
                 h-[30px] pr-4 rounded-xl`}
              >
                <Eye className='mr-2' size={18} />
                {t('component.EyeSelector.leftEye')}
              </Badge>
            </div>
            <div className='flex space-x-2'>
              <Badge
                variant={row.original.rightEye ? 'outline' : 'secondary'}
                className={`pl-4 rounded-xl h-[30px] cursor-pointer ${
                  row.original.rightEye ? 'bg-[#E10600] text-white ' : 'text-[#505050]'
                } ${row.original.added ? 'cursor-not-allowed' : ''}
              : 'cursor-pointer'
                `}
              >
                {t('component.EyeSelector.rightEye')}
                <Eye className='ml-2' size={18} />
              </Badge>
            </div>
          </div>
        )
      },
    },

    {
      accessorKey: '-',

      cell: ({ row }) => {
        return (
          <div className='flex space-x-2'>
            {row.original.added && row?.original?.removePatient ? (
              <>
                <Badge
                  onClick={() => {
                    row?.original?.editPatient?.(row.original.patientId)
                  }}
                  className={`cursor-pointer p-2`}
                >
                  <Pencil size={16} color='white' />
                </Badge>

                <Badge
                  onClick={() => {
                    row?.original?.removePatient?.(row.original.patientId)
                  }}
                  className={`cursor-pointer bg-red-500 hover:bg-red-600 p-2`}
                >
                  <Trash size={16} color='white' />
                </Badge>
              </>
            ) : null}
          </div>
        )
      },
    },
  ]

  return columns
}
