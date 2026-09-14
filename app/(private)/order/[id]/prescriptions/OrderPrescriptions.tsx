import React from 'react'
import { Document, Page } from '@react-pdf/renderer'

import type { OrderWithSubOrders } from '@/types'

import { PrescriptionFields } from './prescription/PrescriptionFields'
import { PrescriptionTemplate } from './prescription/PrescriptionTemplate'

/**
 * One A6 landscape prescription per suborder, built from two layers:
 *
 * - `PrescriptionTemplate` — the red pre-printed form (lines, labels, watermark)
 * - `PrescriptionFields` — the order's and that suborder's patient data
 *
 * `showTemplate={false}` drops the form and prints the data alone, for feeding
 * blanks that already carry it.
 *
 * Both layers are absolutely positioned, so nothing flows and nothing can push
 * a suborder onto a second sheet. The page must NOT be given `wrap={false}`:
 * react-pdf then sizes the page to its content instead of to A6, and content
 * that is all absolute has no height — every page comes out 0pt tall.
 */
export const OrderPrescriptions = ({
  order,
  showTemplate = true,
}: {
  order: OrderWithSubOrders
  showTemplate?: boolean
}) => (
  <Document>
    {order.suborders.map((suborder) => (
      <Page
        key={suborder.id}
        size='A6'
        orientation='landscape'
        style={{ position: 'relative', backgroundColor: '#FFFFFF' }}
      >
        {showTemplate && <PrescriptionTemplate />}
        <PrescriptionFields order={order} suborder={suborder} />
      </Page>
    ))}
  </Document>
)
