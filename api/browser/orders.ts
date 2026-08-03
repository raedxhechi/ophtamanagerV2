'use client'

import { format } from 'date-fns'

import type { Order } from '@/types'

import { client } from './client'

// Columns + relations the order views need. Mirrors the old Directus field list:
// the order, its medicine, and each suborder with its patient (+ that patient's
// insurance company). Note: Supabase orders have no `user_created` relation.
const ORDER_SELECT = `
  *,
  medicine (*),
  suborders (
    *,
    patients (
      *,
      insurance_companies (*)
    )
  )
`

// The `date` columns (application_date / delivery_date) want a plain yyyy-MM-dd
// string; accept either a Date or an existing string.
const toDateOnly = (value: Date | string | null | undefined) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return isNaN(date.getTime()) ? null : format(date, 'yyyy-MM-dd')
}

export const getOrder = async (id: string) => {
  const { data, error } = await client
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as Order
}

export const listOrders = async () => {
  const { data, error } = await client
    .from('orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Order[]
}

export interface OrdersFilters {
  search?: string
  // NOTE: the Supabase `orders` table has no `status` column yet, so this is
  // accepted for API compatibility but not applied.
  status?: string[]
  // Single-day filters as yyyy-MM-dd strings.
  orderDate?: string
  deliveryDate?: string
}

// One page of orders plus the total count, for the paginated list view.
// `orderDate` matches created_at within that calendar day; `deliveryDate`
// matches the delivery_date column directly.
export async function listOrdersPage(
  page: number,
  pageSize: number,
  filters: OrdersFilters = {}
) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('orders')
    .select(ORDER_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.orderDate) {
    query = query
      .gte('created_at', `${filters.orderDate}T00:00:00`)
      .lte('created_at', `${filters.orderDate}T23:59:59`)
  }
  if (filters.deliveryDate) {
    query = query.eq('delivery_date', filters.deliveryDate)
  }
  // `search` and `status` are not applied yet: there is no searchText/status
  // column, and searching across joined patient rows would distort the embedded
  // suborder lists. Revisit once those columns (or an RPC) exist.

  const { data, error, count } = await query
  if (error) throw error

  return { orders: (data ?? []) as unknown as Order[], total: count ?? 0 }
}

// Input shape matches the create-order form: a medicine id, application/delivery
// dates, and the suborders to create. `doctor_office_id` is filled by the DB
// default (current_office_id()), so it isn't set here.
export const createOrder = async (data: any) => {
  const subOrders: any[] = data.subOrders ?? data.suborders ?? []

  // Quantity is a per-eye count: each treated eye counts as one, so a suborder
  // with both eyes set counts as two.
  const eyeCount = subOrders.reduce((total, sub) => {
    const left = sub.leftEye ?? sub.left_eye ?? false
    const right = sub.rightEye ?? sub.right_eye ?? false
    return total + (left ? 1 : 0) + (right ? 1 : 0)
  }, 0)

  const { data: order, error } = await client
    .from('orders')
    .insert({
      medicine_id: data.medicine ?? data.medicine_id,
      quantity: data.quantity ?? eyeCount,
      application_date: toDateOnly(data.applicationDate ?? data.application_date),
      delivery_date: toDateOnly(data.deliveryDate ?? data.delivery_date),
    })
    .select()
    .single()

  if (error) throw error

  if (subOrders.length) {
    const rows = subOrders.map((sub) => ({
      order_id: order.id,
      patient_id: sub.patientId ?? sub.patient_id ?? sub.patient,
      left_eye: sub.leftEye ?? sub.left_eye ?? false,
      right_eye: sub.rightEye ?? sub.right_eye ?? false,
      invoice_type: sub.invoice ?? sub.invoice_type ?? null,
    }))

    const { error: subError } = await client.from('suborders').insert(rows)
    if (subError) throw subError
  }

  return order
}
