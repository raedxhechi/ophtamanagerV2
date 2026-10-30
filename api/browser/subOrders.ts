'use client'

import type { InvoiceType, SubOrder } from '@/types'
import type { TablesInsert } from '@/types/supabase'

import { client } from './client'

// Aliased so the embedded relations come back under the singular keys the
// SubOrder type and the suborder table columns read: `patient` and `order`.
const SUBORDER_SELECT = `
  *,
  patient:patients (
    *,
    insurance_companies (*)
  ),
  order:orders (
    *,
    medicine (*)
  )
`

export const getSubOrder = async (id: string) => {
  const { data, error } = await client
    .from('suborders')
    .select(SUBORDER_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as SubOrder
}

// The suborders swapped out of one original, newest last so the drawer reads as
// a history. One hop only: a swap of a swap hangs off its own parent and is
// found by opening that one, which is what `swapped_from_id` means — the row
// this one directly replaced.
export const listSwaps = async (subOrderId: string) => {
  const { data, error } = await client
    .from('suborders')
    .select(SUBORDER_SELECT)
    .eq('swapped_from_id', subOrderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as SubOrder[]
}

export interface CreateSwapInput {
  /** The suborder being replaced. Becomes the new row's `swapped_from_id`. */
  swappedFromId: string
  patientId: string
  leftEye: boolean
  rightEye: boolean
  invoiceType: InvoiceType
}

/**
 * Create a replacement for an existing suborder: a new suborder on the same
 * order, pointing back at the one it replaces.
 *
 * The order is read off the original rather than passed in, so a swap can only
 * ever land on the order the original belongs to. That read also fails early,
 * with a clearer error than the insert's, when the original is gone or RLS
 * hides it.
 *
 * Not mirrored into Directus: `mirrorToDirectus` only knows 'patient' and
 * 'order', and a suborder added to an order Directus already has would need its
 * own mirror type and server route. Swaps live in Supabase only for now.
 */
export const createSwap = async ({
  swappedFromId,
  patientId,
  leftEye,
  rightEye,
  invoiceType,
}: CreateSwapInput) => {
  const { data: original, error: originalError } = await client
    .from('suborders')
    .select('id, order_id')
    .eq('id', swappedFromId)
    .single()

  if (originalError) throw originalError

  const insert: TablesInsert<'suborders'> = {
    order_id: original.order_id,
    patient_id: patientId,
    left_eye: leftEye,
    right_eye: rightEye,
    invoice_type: invoiceType,
    swapped_from_id: original.id,
  }

  const { data, error } = await client
    .from('suborders')
    .insert(insert)
    .select(SUBORDER_SELECT)
    .single()

  if (error) throw error
  return data as unknown as SubOrder
}

/**
 * Just enough of a suborder to mark it: the eyes, the link to its original, and
 * the patient's name for the mark's tooltip. Deliberately lighter than
 * SUBORDER_SELECT, because this runs for a table of rows rather than one drawer.
 */
const SWAP_RELATION_SELECT = `
  id,
  left_eye,
  right_eye,
  swapped_from_id,
  patient:patients ( first_name, last_name )
`

export interface SwapRelation {
  id: string
  left_eye: boolean
  right_eye: boolean
  swapped_from_id: string | null
  patient: { first_name: string | null; last_name: string | null } | null
}

/**
 * The rows needed to mark a set of suborders that do not sit in one order:
 * every swap made out of them, and every original they themselves replace.
 *
 * The orders page needs none of this — a swap is created on its original's own
 * order, so the marks come straight out of the rows already on screen. One
 * patient's suborders span orders, though, and a swap names a *different*
 * patient, so neither direction is in that list. Fed back into `swapMarkings`
 * alongside the rows being rendered, this closes the gap.
 */
export const listSwapRelations = async ({
  subOrderIds,
  originalIds,
}: {
  /** Rows being marked; their swaps are what the amber/green mark counts. */
  subOrderIds: string[]
  /** The `swapped_from_id`s among those rows, for naming their originals. */
  originalIds: string[]
}) => {
  const rows: SwapRelation[] = []

  if (subOrderIds.length) {
    const { data, error } = await client
      .from('suborders')
      .select(SWAP_RELATION_SELECT)
      .in('swapped_from_id', subOrderIds)

    if (error) throw error
    rows.push(...((data ?? []) as unknown as SwapRelation[]))
  }

  if (originalIds.length) {
    const { data, error } = await client
      .from('suborders')
      .select(SWAP_RELATION_SELECT)
      .in('id', originalIds)

    if (error) throw error
    rows.push(...((data ?? []) as unknown as SwapRelation[]))
  }

  return rows
}
