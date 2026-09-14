'use client'
import React, { useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { useTranslations } from 'next-intl'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useGetOrder } from '@/react-query/orders'
import { OrderPrescriptions } from './OrderPrescriptions'

export default function PrescriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const t = useTranslations('component.OrderDataTableRowActions')

  // Fetched through ORDER_SELECT, which embeds what the prescription prints and
  // the orders table's own query doesn't: the office and its default doctor.
  const { data: order, isError, isPending } = useGetOrder(id)

  // On by default: the full form. Off prints the data alone, for blanks that
  // already carry the red form.
  const [showTemplate, setShowTemplate] = useState(true)

  return (
    <div className='flex h-screen flex-col'>
      <div className='flex items-center gap-2 border-b px-4 py-2'>
        <Switch id='prescription-template' checked={showTemplate} onCheckedChange={setShowTemplate} />
        <Label htmlFor='prescription-template'>{t('showTemplate')}</Label>
      </div>
      {isPending && <p>Loading...</p>}
      {isError && <p>Error loading order.</p>}
      {order && (
        <PDFViewer style={{ width: '100%', flex: 1, border: 0 }}>
          <OrderPrescriptions order={order} showTemplate={showTemplate} />
        </PDFViewer>
      )}
    </div>
  )
}
