'use client'

import type { SubOrder } from '@/types'

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
