import React from 'react'
import { Document, Page } from '@react-pdf/renderer'

import type { OrderWithSubOrders } from '@/types'

import {
  DEFAULT_PRESCRIPTION_LAYOUT,
  PRESCRIPTION_LAYOUTS,
  type PrescriptionLayoutId,
} from './prescription/layouts'

/**
 * One A6 landscape prescription per suborder — or just the ones named by
 * `suborderIds` — built from the chosen layout's two layers:
 *
 * - `Template` — the pre-printed paper (lines, labels, letterhead)
 * - `Fields` — the order's and that suborder's patient data
 *
 * `showTemplate={false}` drops the paper and prints the data alone, for feeding
 * blanks that already carry it.
 *
 * Both layers are absolutely positioned, so nothing flows and nothing can push
 * a suborder onto a second sheet. The page must NOT be given `wrap={false}`:
 * react-pdf then sizes the page to its content instead of to A6, and content
 * that is all absolute has no height — every page comes out 0pt tall.
 */
export const OrderPrescriptions = ({
  order,
  suborderIds,
  layout = DEFAULT_PRESCRIPTION_LAYOUT,
  showTemplate = true,
}: {
  order: OrderWithSubOrders
  suborderIds?: string[]
  layout?: PrescriptionLayoutId
  showTemplate?: boolean
}) => {
  const { Template, Fields } = PRESCRIPTION_LAYOUTS[layout]
  const suborders = suborderIds
    ? order.suborders.filter((suborder) => suborderIds.includes(suborder.id))
    : order.suborders

  return (
    <Document>
      {suborders.map((suborder) => (
        <Page
          key={suborder.id}
          size='A6'
          orientation='landscape'
          style={{ position: 'relative', backgroundColor: '#FFFFFF' }}
        >
          {showTemplate && <Template order={order} />}
          <Fields order={order} suborder={suborder} />
        </Page>
      ))}
    </Document>
  )
}
