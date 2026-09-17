'use client'
import React, { useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { useTranslations } from 'next-intl'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useGetOrder } from '@/react-query/orders'
import { OrderPrescriptions } from './OrderPrescriptions'
import {
  DEFAULT_PRESCRIPTION_LAYOUT,
  PRESCRIPTION_LAYOUT_IDS,
  type PrescriptionLayoutId,
} from './prescription/layouts'

/**
 * The prescriptions for an order: one page per suborder, or — with
 * `?suborder=<id>`, as the suborder table links it — just that suborder's page.
 * Only the single-suborder view offers a choice of layout; the whole order
 * always prints as Muster 16.
 */
export default function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ suborder?: string | string[] }>
}) {
  const { id } = React.use(params)
  const { suborder } = React.use(searchParams)
  const suborderId = typeof suborder === 'string' ? suborder : undefined
  const t = useTranslations('component.OrderDataTableRowActions')

  // Fetched through ORDER_SELECT, which embeds what the prescription prints and
  // the orders table's own query doesn't: the office and its default doctor.
  const { data: order, isError, isPending } = useGetOrder(id)

  // Off by default: the data alone, for printing onto blanks that already carry
  // the form. On draws the form too.
  const [showTemplate, setShowTemplate] = useState(false)
  const [layout, setLayout] = useState<PrescriptionLayoutId>(DEFAULT_PRESCRIPTION_LAYOUT)

  // A suborder id from the URL that isn't in this order would otherwise render
  // an empty document.
  const suborderMissing =
    !!order && !!suborderId && !order.suborders.some((sub) => sub.id === suborderId)

  return (
    <div className='flex h-screen flex-col'>
      <div className='flex flex-wrap items-center gap-6 border-b px-4 py-2'>
        <div className='flex items-center gap-2'>
          <Switch id='prescription-template' checked={showTemplate} onCheckedChange={setShowTemplate} />
          <Label htmlFor='prescription-template'>{t('showTemplate')}</Label>
        </div>
        {suborderId && (
          <div className='flex items-center gap-2'>
            <Label htmlFor='prescription-layout'>{t('layout')}</Label>
            <Select value={layout} onValueChange={(value) => setLayout(value as PrescriptionLayoutId)}>
              <SelectTrigger id='prescription-layout' className='w-[260px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESCRIPTION_LAYOUT_IDS.map((layoutId) => (
                  <SelectItem key={layoutId} value={layoutId}>
                    {t(`layouts.${layoutId}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {isPending && <p>Loading...</p>}
      {isError && <p>Error loading order.</p>}
      {suborderMissing && <p>{t('suborderNotFound')}</p>}
      {order && !suborderMissing && (
        <PDFViewer style={{ width: '100%', flex: 1, border: 0 }}>
          <OrderPrescriptions
            order={order}
            suborderId={suborderId}
            layout={suborderId ? layout : DEFAULT_PRESCRIPTION_LAYOUT}
            showTemplate={showTemplate}
          />
        </PDFViewer>
      )}
    </div>
  )
}
