import type { ComponentType } from 'react'

import type { InvoiceType, OrderSubOrder, OrderWithSubOrders } from '@/types'

import { LetterheadFields } from './LetterheadFields'
import { LetterheadTemplate } from './LetterheadTemplate'
import { PrescriptionFields } from './PrescriptionFields'
import { GkvTemplate, PrescriptionTemplate } from './PrescriptionTemplate'

/**
 * Every prescription layout is a pair of full-sheet layers measured off the
 * same scan: the pre-printed paper (`Template`) and the data printed onto it
 * (`Fields`). Adding a layout is adding an entry here, plus its label in
 * messages/ under `component.OrderDataTableRowActions.layouts`.
 */
export const PRESCRIPTION_LAYOUTS = {
  /** The Muster 16 pad, printed as "IVOM PRIVATREZEPT". */
  ivom: { Template: PrescriptionTemplate, Fields: PrescriptionFields },
  /** The GKV pad: the same form, with nothing naming it IVOM. */
  gkv: { Template: GkvTemplate, Fields: PrescriptionFields },
  /** The Privat pad: the practice's own letterhead. */
  privat: { Template: LetterheadTemplate, Fields: LetterheadFields },
} satisfies Record<
  string,
  {
    Template: ComponentType<{ order: OrderWithSubOrders }>
    Fields: ComponentType<{ order: OrderWithSubOrders; suborder: OrderSubOrder }>
  }
>

export type PrescriptionLayoutId = keyof typeof PRESCRIPTION_LAYOUTS

export const PRESCRIPTION_LAYOUT_IDS = Object.keys(PRESCRIPTION_LAYOUTS) as PrescriptionLayoutId[]

export const DEFAULT_PRESCRIPTION_LAYOUT: PrescriptionLayoutId = 'ivom'

/**
 * Which pad a suborder is normally written on, by who is being billed. Only the
 * starting point — the prescriptions view still lets the layout be changed by
 * hand, and falls back here for a suborder whose invoice type is unset.
 */
const LAYOUT_BY_INVOICE_TYPE: Record<InvoiceType, PrescriptionLayoutId> = {
  Patient: 'privat',
  Praxis: 'ivom',
  Kasse: 'gkv',
}

export const layoutForInvoiceType = (invoiceType?: InvoiceType | null): PrescriptionLayoutId =>
  (invoiceType && LAYOUT_BY_INVOICE_TYPE[invoiceType]) || DEFAULT_PRESCRIPTION_LAYOUT
