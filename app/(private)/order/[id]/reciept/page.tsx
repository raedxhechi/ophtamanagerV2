'use client'
import React from 'react'
import { PDFViewer } from '@react-pdf/renderer'

import { useGetOrder } from '@/react-query/orders'
import { OrderReceipt } from './OrderReceipt'

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)

  const { data: order, isError, isPending } = useGetOrder(id)


  return (
    <div>
      {isPending && <p>Loading...</p>}
      {isError && <p>Error loading order.</p>}
      {order && (
        <PDFViewer style={{ width: '100%', height: '100vh' }}>
          <OrderReceipt order={order} />
        </PDFViewer>
      )}
    </div>
  )
}
