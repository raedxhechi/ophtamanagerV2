'use client'

import { format } from 'date-fns'

import type { CreateDraftOrderInput, DraftOrder, DraftSubOrderInput } from '@/types'

import { client } from './client'

// Columns + relations the draft views need — the same graph as ORDER_SELECT, but
// off `draft_orders`. The suborder relation is aliased to `subOrders` (and its
// patient to `patient`) so the create-order form can read a draft with the same
// keys it uses for an order. `medicine` may be null: a draft can be parked
// before one is picked.
const DRAFT_ORDER_SELECT = `
  *,
  medicine (*),
  subOrders:draft_suborders (
    *,
    patient:patients (
      *,
      insurance_companies (*)
    )
  )
`

// The `date` columns want a plain yyyy-MM-dd string; accept a Date, an existing
// string, or nothing at all (drafts may have neither date filled in yet).
const toDateOnly = (value: Date | string | null | undefined) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return isNaN(date.getTime()) ? null : format(date, 'yyyy-MM-dd')
}

export const listDraftOrders = async () => {
  const { data, error } = await client
    .from('draft_orders')
    .select(DRAFT_ORDER_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as DraftOrder[]
}

export const getDraftOrder = async (id: string) => {
  const { data, error } = await client
    .from('draft_orders')
    .select(DRAFT_ORDER_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as DraftOrder
}

// Insert the draft's suborder rows. Only `patient_id` is required; everything
// else falls back to the column defaults / null.
const insertDraftSubOrders = async (
  draftOrderId: string,
  subOrders: DraftSubOrderInput[]
) => {
  if (!subOrders.length) return

  const rows = subOrders.map((sub) => ({
    draft_order_id: draftOrderId,
    patient_id: sub.patient_id,
    left_eye: sub.left_eye ?? false,
    right_eye: sub.right_eye ?? false,
    invoice_type: sub.invoice_type ?? null,
  }))

  const { error } = await client.from('draft_suborders').insert(rows)
  if (error) throw error
}

// `doctor_office_id` and `created_by` are filled by the DB defaults
// (current_office_id() / auth.uid()), so they aren't set here.
export const createDraftOrder = async (data: CreateDraftOrderInput) => {
  const { subOrders = [], ...draft } = data

  const { data: draftOrder, error } = await client
    .from('draft_orders')
    .insert({
      medicine_id: draft.medicine_id ?? null,
      quantity: draft.quantity ?? null,
      application_date: toDateOnly(draft.application_date),
      delivery_date: toDateOnly(draft.delivery_date),
    })
    .select()
    .single()

  if (error) throw error

  await insertDraftSubOrders(draftOrder.id, subOrders)

  return draftOrder
}

/**
 * Overwrite an existing draft in place, so re-parking a draft that's being
 * edited keeps its id (and the `?draft=` link that points at it). The suborders
 * are replaced wholesale rather than diffed — a draft is scratch data and the
 * form always submits the complete list.
 */
export const updateDraftOrder = async (
  id: string,
  data: CreateDraftOrderInput
) => {
  const { subOrders = [], ...draft } = data

  const { data: draftOrder, error } = await client
    .from('draft_orders')
    .update({
      medicine_id: draft.medicine_id ?? null,
      quantity: draft.quantity ?? null,
      application_date: toDateOnly(draft.application_date),
      delivery_date: toDateOnly(draft.delivery_date),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const { error: deleteError } = await client
    .from('draft_suborders')
    .delete()
    .eq('draft_order_id', id)

  if (deleteError) throw deleteError

  await insertDraftSubOrders(id, subOrders)

  return draftOrder
}

/**
 * Delete a draft and its suborders. The child rows go first: the
 * draft_suborders → draft_orders foreign key is ON DELETE RESTRICT, so the
 * parent delete would otherwise fail.
 */
export const deleteDraftOrder = async (id: string) => {
  const { error: subError } = await client
    .from('draft_suborders')
    .delete()
    .eq('draft_order_id', id)

  if (subError) throw subError

  const { error } = await client.from('draft_orders').delete().eq('id', id)
  if (error) throw error

  return id
}
