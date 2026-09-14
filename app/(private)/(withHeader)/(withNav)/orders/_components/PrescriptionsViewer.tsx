'use client'

import { PDFViewer } from '@react-pdf/renderer'

import type { OrderWithSubOrders } from '@/types'

import { OrderPrescriptions } from './OrderPrescriptions'

// Kept in its own module so PrescriptionsDialog can load it with `ssr: false`:
// react-pdf needs the browser, and the orders list shouldn't ship it until a
// dialog is actually opened.
export default function PrescriptionsViewer({ order }: { order: OrderWithSubOrders }) {
  return (
    <PDFViewer style={{ width: '100%', height: '100%', border: 0 }}>
      <OrderPrescriptions order={order} />
    </PDFViewer>
  )
}
