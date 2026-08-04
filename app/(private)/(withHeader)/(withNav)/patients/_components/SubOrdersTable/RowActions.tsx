'use client'

import { Row } from '@tanstack/react-table'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ArrowUpRightFromSquare, ChevronDown, CircleSlash, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

import styles from './wiggle.module.css'
import { useState } from 'react'
// import { useAppStore } from '@/zustand/app/app-provider'
import { useTranslations } from 'next-intl'

export interface PatientWithSubOrders {
  id: string;
  name: string;
  suborders: any[];
}


interface DataTableRowActionsProps {
  row?: Row<PatientWithSubOrders | undefined>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
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
      {row?.getIsExpanded() ? (
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
