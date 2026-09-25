'use client'
import React, { useMemo, useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { Printer } from 'lucide-react'
import { useTranslations } from 'next-intl'

import type { OrderSubOrder } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetOrder } from '@/react-query/orders'
import { OrderPrescriptions } from './OrderPrescriptions'
import { usePrescriptionPrinter } from './usePrescriptionPrinter'
import {
  PRESCRIPTION_LAYOUT_IDS,
  layoutForInvoiceType,
  type PrescriptionLayoutId,
} from './prescription/layouts'

/**
 * The prescriptions for an order, in one of two views:
 *
 * - the whole order — one column per pad (IVOM, Pink, Bleu), each holding the
 *   suborders whose invoice type calls for that pad and printing on its own.
 *   Each pad is a separate run through the printer, on different paper, so the
 *   split is the point: load one pad, print its column, load the next.
 * - `?suborder=<id>`, as the suborder table links it — that suborder alone, on
 *   the pad its invoice type calls for, changeable by hand.
 *
 * Two documents, deliberately different: the preview always draws the form
 * template, so the data can be checked against the boxes it belongs in, while
 * Print renders a second document without it — the blanks in the printer
 * already carry the form. That is also why the viewers' own toolbars are
 * hidden: their print button would print the preview, template and all.
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

  // Null until the layout is picked by hand, so that until then it can follow
  // the suborder — which only arrives with the order, after the first render.
  const [pickedLayout, setPickedLayout] = useState<PrescriptionLayoutId | null>(null)

  const { print, printingKey, isPrinting, frameProps } = usePrescriptionPrinter()

  const selectedSuborder =
    suborderId && order ? order.suborders.find((sub) => sub.id === suborderId) : undefined

  // A suborder id from the URL that isn't in this order would otherwise render
  // an empty document.
  const suborderMissing = !!order && !!suborderId && !selectedSuborder

  const layout = pickedLayout ?? layoutForInvoiceType(selectedSuborder?.invoice_type)

  // The whole-order view's columns: every pad gets one, empty ones included, so
  // the three always sit in the same place.
  const columns = useMemo(() => {
    const byLayout = Object.fromEntries(
      PRESCRIPTION_LAYOUT_IDS.map((layoutId) => [layoutId, [] as OrderSubOrder[]]),
    ) as Record<PrescriptionLayoutId, OrderSubOrder[]>
    order?.suborders.forEach((sub) => byLayout[layoutForInvoiceType(sub.invoice_type)].push(sub))
    return byLayout
  }, [order])

  if (isPending) return <p className='p-4'>Loading...</p>
  if (isError) return <p className='p-4'>Error loading order.</p>
  if (!order) return null
  if (suborderMissing) return <p className='p-4'>{t('suborderNotFound')}</p>

  // ── One suborder: the picker and a single preview ─────────────────────────
  if (suborderId) {
    return (
      <div className='flex h-screen flex-col'>
        <div className='flex flex-wrap items-center gap-6 border-b px-4 py-2'>
          <Button
            size='sm'
            disabled={isPrinting}
            onClick={() =>
              print(
                layout,
                <OrderPrescriptions
                  order={order}
                  suborderIds={[suborderId]}
                  layout={layout}
                  showTemplate={false}
                />,
              )
            }
          >
            <Printer className='size-4' />
            {t('print')}
          </Button>
          <div className='flex items-center gap-2'>
            <Label htmlFor='prescription-layout'>{t('layout')}</Label>
            <Select
              value={layout}
              onValueChange={(value) => setPickedLayout(value as PrescriptionLayoutId)}
            >
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
          <p className='text-muted-foreground text-sm'>{t('printWithoutTemplateHint')}</p>
        </div>
        <PDFViewer showToolbar={false} style={{ width: '100%', flex: 1, border: 0 }}>
          <OrderPrescriptions order={order} suborderIds={[suborderId]} layout={layout} showTemplate />
        </PDFViewer>
        <iframe {...frameProps} />
      </div>
    )
  }

  // ── The whole order: one column per pad ───────────────────────────────────
  return (
    <div className='flex h-screen flex-col'>
      <div className='border-b px-4 py-2'>
        <p className='text-muted-foreground text-sm'>{t('printWithoutTemplateHint')}</p>
      </div>
      <div className='grid min-h-0 flex-1 grid-cols-3'>
        {PRESCRIPTION_LAYOUT_IDS.map((layoutId) => {
          const suborders = columns[layoutId]
          const suborderIds = suborders.map((sub) => sub.id)
          return (
            <div key={layoutId} className='flex min-w-0 flex-col border-r last:border-r-0'>
              <div className='flex items-center justify-between gap-2 border-b px-3 py-2'>
                <span className='truncate font-medium'>
                  {t(`layouts.${layoutId}`)}
                  <span className='text-muted-foreground ml-2 text-xs font-normal'>
                    {suborders.length}
                  </span>
                </span>
                <Button
                  size='sm'
                  disabled={!suborders.length || isPrinting}
                  onClick={() =>
                    print(
                      layoutId,
                      <OrderPrescriptions
                        order={order}
                        suborderIds={suborderIds}
                        layout={layoutId}
                        showTemplate={false}
                      />,
                    )
                  }
                >
                  <Printer className='size-4' />
                  {printingKey === layoutId ? t('printing') : t('print')}
                </Button>
              </div>
              {suborders.length ? (
                <PDFViewer showToolbar={false} style={{ width: '100%', flex: 1, border: 0 }}>
                  <OrderPrescriptions
                    order={order}
                    suborderIds={suborderIds}
                    layout={layoutId}
                    showTemplate
                  />
                </PDFViewer>
              ) : (
                <p className='text-muted-foreground p-4 text-sm'>{t('noPrescriptionsForPad')}</p>
              )}
            </div>
          )
        })}
      </div>
      <iframe {...frameProps} />
    </div>
  )
}
