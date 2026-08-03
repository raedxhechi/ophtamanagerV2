'use client'

import { ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'

// import { CreateOrderTableItem, createOrderTableSchema } from './schema'

import { Edit, Eye, Pencil, Plus, Trash } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { SelectInput } from '@/components/ui/selectInput'

export const useCreateOrderColumns = () => {
  const t = useTranslations()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'number',

      cell: ({ row }) => (
        <div className={`${row.original.disabled ? 'cursor-not-allowed text-[#9F9F9F]' : ''}`}>
          {row.getValue('number')}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'fullName',

      cell: ({ row }) => (
        <div className={`${row.original.disabled ? 'cursor-not-allowed text-[#9F9F9F]' : ''}`}>
          {row.getValue('fullName')}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'dateOfBirth',

      cell: ({ row }) => (
        <div className={`${row.original.disabled ? 'cursor-not-allowed text-[#9F9F9F]' : ''}`}>
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
            <Badge
              variant='outline'
              className={`${row.original.disabled ? 'cursor-not-allowed text-[#9F9F9F]' : ''}`}
            >
              {row.getValue('ikNumber')}
            </Badge>
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
            {/* <Badge
              variant='outline'
              className={`${row.original.disabled ? 'cursor-not-allowed text-[#9F9F9F]' : ''}`}
            >
              {row.getValue('ikNumber')}
            </Badge> */}
            <SelectInput
              disabled={!!row.original.added || row.original.disabled}
              listValues={['Patient', 'Kasse', 'Praxis']}
              name='invoice'
              label='Rechnungsstellung'
              setValue={(val) => {
                row.original.selectInvoice({ id: row.original.patientId, invoice: val })
              }}
              value={row.original.invoice}
              // setValue={(value) => row.original.({ invoice: value })}
              // value={field.value}
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
                onClick={() => {
                  !row.original.added &&
                    !row.original.disabled &&
                    row.original.toggleEye({
                      leftEye: !row.original.leftEye,
                      id: row.original.patientId,
                      rightEye: row.original.rightEye,
                    })
                }}
                className={`  ${
                  row.original.leftEye ? 'bg-[#0000ff] text-white' : 'text-[#505050]'
                } ${row.original.added ? 'cursor-not-allowed' : ''}
                ${
                  row.original.disabled ? 'cursor-not-allowed text-[#CCCCCC]' : 'cursor-pointer'
                } h-[30px] pr-4 rounded-xl`}
              >
                <Eye className='mr-2' size={18} />
                {t('component.EyeSelector.leftEye')}
              </Badge>
            </div>
            <div className='flex space-x-2'>
              <Badge
                variant={row.original.rightEye ? 'outline' : 'secondary'}
                onClick={() => {
                  !row.original.added &&
                    !row.original.disabled &&
                    row.original.toggleEye({
                      rightEye: !row.original.rightEye,
                      id: row.original.patientId,
                      leftEye: row.original.leftEye,
                    })
                }}
                className={`pl-4 rounded-xl h-[30px] cursor-pointer ${
                  row.original.rightEye ? 'bg-[#E10600] text-white ' : 'text-[#505050]'
                } ${row.original.added ? 'cursor-not-allowed' : ''}
                ${row.original.disabled ? 'cursor-not-allowed text-[#CCCCCC]' : 'cursor-pointer'}
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
            ) : row?.original?.selectPatient ? (
              <Badge
                onClick={() => {
                  if (!row.original.disabled && (row.original.rightEye || row.original.leftEye)) {
                    row?.original?.selectPatient?.(row.original.patientId)
                  }
                }}
                className={`cursor-pointer p-2 ${
                  row.original.disabled
                    ? 'cursor-not-allowed bg-[#CCCCCC] hover:bg-[#cccccc]'
                    : 'cursor-pointer'
                }`}
              >
                <Plus size={16} />
              </Badge>
            ) : null}
          </div>
        )
      },
    },
  ]

  return columns
}
