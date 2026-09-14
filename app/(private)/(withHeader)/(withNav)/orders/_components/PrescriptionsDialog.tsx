'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useGetOrder } from '@/react-query/orders'
import type { OrderWithSubOrders } from '@/types'

const PrescriptionsViewer = dynamic(() => import('./PrescriptionsViewer'), {
  ssr: false,
})

/**
 * The PDF needs the full order: its office, the office's default doctor and the
 * creator. The table's own query (OrdersData) embeds none of those, so the order
 * is fetched again through ORDER_SELECT — the same way the receipt page does it.
 * Rendered inside DialogContent, which unmounts while the dialog is closed, so
 * the fetch only happens once a dialog is actually opened.
 */
function PrescriptionsBody({ id }: { id: string }) {
  const { data: order, isPending, isError } = useGetOrder(id)

  if (isPending) {
    return <p className='text-muted-foreground text-sm'>Loading…</p>
  }
  if (isError) {
    return <p className='text-destructive text-sm'>Error loading order.</p>
  }
  return <PrescriptionsViewer order={order} />
}

export function PrescriptionsDialog({ order }: { order: OrderWithSubOrders }) {
  const t = useTranslations('component.OrderDataTableRowActions')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='default'
          title={t('prescriptions')}
          disabled={!order.suborders.length}
          onClick={(e) => e.stopPropagation()}
        >
          <FileText />
        </Button>
      </DialogTrigger>
      {/* The dialog is portalled, but React still bubbles its clicks up to the
          table row — stop them here so clicking inside doesn't toggle the row. */}
      <DialogContent
        className='flex h-[85vh] flex-col sm:max-w-4xl'
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{t('prescriptions')}</DialogTitle>
          <DialogDescription>{order.medicine?.name}</DialogDescription>
        </DialogHeader>
        <div className='min-h-0 flex-1'>
          <PrescriptionsBody id={order.id} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
