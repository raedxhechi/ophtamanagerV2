'use client'

import { Row } from '@tanstack/react-table'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ChevronDown, CircleSlash, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

import styles from './wiggle.module.css'
import { useState } from 'react'
// import { useAppStore } from '@/zustand/app/app-provider'
import { useTranslations } from 'next-intl'

export interface PatientWithSubOrders {
  id: string;
  suborders: any[];
}


interface DataTableRowActionsProps<T extends PatientWithSubOrders> {
  row?: Row<T>
  /** True while this patient's suborders are still being fetched. */
  loading?: boolean
}

export function DataTableRowActions<T extends PatientWithSubOrders>({
  row,
  loading,
}: DataTableRowActionsProps<T>) {
//   const { setexportOrderModal } = useAppStore((state) => state)
  const patient = row?.original
  const [isWiggling, setIsWiggling] = useState(false)
  const  t  = useTranslations()

  const handleClick = (e: any) => {
    e.stopPropagation()

    if (patient && !patient.suborders.length) {
      // Trigger wiggle animation
      setIsWiggling(true)

      // Remove the wiggle class after animation duration (500ms)
      setTimeout(() => setIsWiggling(false), 500)
    } else {
      row?.toggleExpanded()
    }
  }
  return (
  <div className={cn('flex items-center space-x-2 w-[200px]')}>
      {loading ? (
        <Button variant='ghost' disabled className='hover:bg-transparent'>
          <span className='mr-2 text-[#CCCCCC]'>
            {t('component.OrderDataTableRowActions.orderDetails')}
          </span>
          <Loader2 size={22} className='animate-spin text-[#cccccc]' />
        </Button>
      ) : row?.getIsExpanded() ? (
        <Button variant='secondary' onClick={handleClick}>
          <>
            <span className='mr-2'>{t('component.OrderDataTableRowActions.hideDetails')}</span>
            <ChevronDown
              size={22}
              className='transition-transform duration-300 transform rotate-180'
            />
          </>
        </Button>
      ) : (
        <Button
          variant={`${!patient?.suborders.length ? 'ghost' : 'secondary'}`}
          onClick={handleClick}
          className={`${!patient?.suborders.length && 'hover:bg-transparent'}  ${
            isWiggling ? styles.wiggle : ''
          } transition-transform`}
        >
          {!patient?.suborders.length ? (
            <>
              <span className='mr-2 text-[#CCCCCC]'>
                {t('component.OrderDataTableRowActions.orderDetails')}
              </span>
              <CircleSlash size={22} className='text-[#cccccc]' />
            </>
          ) : (
            <>
              <span className='mr-2'>{t('component.OrderDataTableRowActions.orderDetails')}</span>
              <ChevronDown
                size={22}
                className='transition-transform duration-300 transform rotate-0'
              />
            </>
          )}
        </Button>
      )}

    </div>
  )
}
