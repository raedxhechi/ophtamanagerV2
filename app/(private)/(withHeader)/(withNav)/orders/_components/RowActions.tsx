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
import { OrderWithSubOrders } from '@/types'

interface DataTableRowActionsProps {
  row: Row<OrderWithSubOrders>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
//   const { setexportOrderModal } = useAppStore((state) => state)
  const order = row.original
  const [isWiggling, setIsWiggling] = useState(false)
  const  t  = useTranslations()

  const handleClick = (e: any) => {
    e.stopPropagation()

    if (!order.suborders.length) {
      // Trigger wiggle animation
      setIsWiggling(true)

      // Remove the wiggle class after animation duration (500ms)
      setTimeout(() => setIsWiggling(false), 500)
    } else {
      row.toggleExpanded()
    }
  }
  return (
    <div className={cn('flex items-center space-x-2 w-[200px]')}>
      {row.getIsExpanded() ? (
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
          variant={`${!order.suborders.length ? 'ghost' : 'secondary'}`}
          onClick={handleClick}
          className={`${!order.suborders.length && 'hover:bg-transparent'}  ${
            isWiggling ? styles.wiggle : ''
          } transition-transform`}
        >
          {!order.suborders.length ? (
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
      <Button
        variant='default'
        onClick={() => {
          console.log({ orderToPdf: order })
        //   setexportOrderModal({ open: true, order: order })
        }}
      >
        <ArrowUpRightFromSquare />
      </Button>
      <Link href={`/order/${row.original.id}/print`} target='_blank' rel='noopener noreferrer'>
        <Button variant='default'>
          <Printer />
        </Button>
      </Link>
    </div>
  )
}
