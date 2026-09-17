import type { ComponentType } from 'react'

import type { OrderSubOrder, OrderWithSubOrders } from '@/types'

import { LetterheadFields } from './LetterheadFields'
import { LetterheadTemplate } from './LetterheadTemplate'
import { PrescriptionFields } from './PrescriptionFields'
import { PrescriptionTemplate } from './PrescriptionTemplate'

/**
 * Every prescription layout is a pair of full-sheet layers measured off the
 * same scan: the pre-printed paper (`Template`) and the data printed onto it
 * (`Fields`). Adding a layout is adding an entry here, plus its label in
 * messages/ under `component.OrderDataTableRowActions.layouts`.
 */
export const PRESCRIPTION_LAYOUTS = {
  /** Muster 16, printed as "IVOM PRIVATREZEPT". */
  muster16: { Template: PrescriptionTemplate, Fields: PrescriptionFields },
  /** The practice's own letterhead pad. */
  letterhead: { Template: LetterheadTemplate, Fields: LetterheadFields },
} satisfies Record<
  string,
  {
    Template: ComponentType<{ order: OrderWithSubOrders }>
    Fields: ComponentType<{ order: OrderWithSubOrders; suborder: OrderSubOrder }>
  }
>

export type PrescriptionLayoutId = keyof typeof PRESCRIPTION_LAYOUTS

export const PRESCRIPTION_LAYOUT_IDS = Object.keys(PRESCRIPTION_LAYOUTS) as PrescriptionLayoutId[]

export const DEFAULT_PRESCRIPTION_LAYOUT: PrescriptionLayoutId = 'muster16'
